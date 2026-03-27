import { AppError } from '../shared/error-handler.ts'
import { logger } from '../shared/logger.ts'
import { prisma } from '../shared/prisma.ts'
import type { AuthorizedContractData, DepositData, DocumentUpdateData, FailedTransferData, InternalReturnData, RejectedDepositData, SpeiReturnData, SuccessfulTransferData } from '../types/webhook.types.ts'

const getAccountTypeFromClabe = (clabe: string): number => {
  if (clabe.length === 18) return 40 // CLABE
  if (clabe.length === 16) return 3 // Debit Card Number
  if (clabe.length === 10) return 10 // Phone Number
  return 40 // Default fallback
}

export class KuspitWebhookService {
  /**
   * Process Event 01: Deposit (Incoming SPEI)
   */
  static async handleDeposit(
    data: DepositData,
    logContext: {
      webhookId: string
      folioInterno: string
      evento: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
    },
  ) {
    const {
      claveRastreo,
      monto,
      cuentaBeneficiaria,
      institucionOrdenante,
      nombreOrdenante,
      concepto,
      referenciaNumerica,
      cuentaOrdenante,
      rfcOrdenante,
    } = data

    logger.info({ ...logContext }, '🔄 Starting deposit process...')

    // 1. IDEMPOTENCY: Check if we have already processed this crawl before
    const existing = await prisma.movement.findFirst({
      where: { trackingKey: claveRastreo, idMovementType: 2, idMovementStatus: 1 },
    })

    if (existing) {
      logger.warn({ ...logContext }, '⏭️ Deposit already registered previously. Skipping.')
      return
    }

    // 2. SEARCH DESTINATION ACCOUNT
    // We look for the local account that has that CLABE assigned to it
    const receiverClabe = await prisma.clabe.findFirst({
      where: { clabe: cuentaBeneficiaria },
      include: {
        stpAccountClabe: {
          include: {
            account: true,
          },
        },
      },
    })

    if (!receiverClabe || !receiverClabe.stpAccountClabe[0]) {
      logger.error({ ...logContext, cuentaBeneficiaria }, '🚨 Deposit received in unassigned or not found CLABE')
      // Optional: Save in another part
      return
    }

    const accountId = receiverClabe.stpAccountClabe[0].idAccount

    // 3. SENDER CLABE LOGIC
    let senderBankId = 1
    const bank = await prisma.institution.findFirst({
      where: { code: institucionOrdenante },
    })

    if (bank) senderBankId = bank.id

    let senderClabeRecord = await prisma.clabe.findFirst({
      where: { clabe: cuentaOrdenante },
    })

    if (!senderClabeRecord) {
      logger.info({ ...logContext }, '👤 New payer detected. Registering......')

      const typeCode = getAccountTypeFromClabe(cuentaOrdenante)
      const typeRecord = await prisma.clabeType.findFirst({ where: { code: typeCode } })

      senderClabeRecord = await prisma.clabe.create({
        data: {
          clabe: cuentaOrdenante,
          ownerName: nombreOrdenante,
          ownerRfcCurp: rfcOrdenante || 'ND',
          idInstitution: senderBankId,
          idClabeType: typeRecord?.id ?? 1, // Fallback ID
        },
      })
    }

    if (!senderClabeRecord) {
      throw new AppError(500, 'Critical: Failed to resolve sender clabe record')
    }

    // 4. ATOMIC TRANSACTION
    await prisma.$transaction(async (tx) => {
      // A. Add Balance
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: Number(monto) } },
      })

      // B. Create Movement
      await tx.movement.create({
        data: {
          idAccount: accountId,
          idMovementType: 2, // 2 = DEPÓSITO
          idMovementStatus: 1, // 1 = COMPLETED
          trackingKey: claveRastreo,
          amount: Number(monto),
          business: nombreOrdenante,
          paymentConcept: concepto,
          reference: referenciaNumerica?.toString(),
          idReceiverClabe: receiverClabe.id,
          idSenderClabe: senderClabeRecord.id,
          currentBalance: updatedAccount.balance, // Guardamos el saldo POSTERIOR al abono

          // Meta info
          idMovementBank: claveRastreo,

          commission: 0,
          utility: 0,
          deposit: Number(monto),
        },
      })
    })

    logger.info({ ...logContext, accountId, nuevoSaldo: true }, '✅ Deposit applied successfully')
  }

  /**
   * Process Event 02: Deposit Rejected (Return)
   * The money bounced on entry. We don’t add to the balance, we only record the history.
   */
  static async handleDepositRejection(
    data: RejectedDepositData,
    logContext: {
      webhookId: string
      folioInterno: string
      evento: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
    },
  ) {
    const {
      claveRastreo,
      monto,
      contrato,
      causaDevolucion,
      conceptoPago,
    } = data

    logger.warn({ ...logContext }, '⚠️ Processing Rejected Deposit (Event 02)...')

    // 1. IDEMPOTENCY
    const existing = await prisma.movement.findFirst({
      where: { trackingKey: claveRastreo, idMovementType: 2, idMovementStatus: 3 },
    })

    if (existing) {
      logger.info({ ...logContext }, '⏭️ Rejection already registered. Skipping.')
      return
    }

    // 2. SEARCH FOR THE USER BY CONTRACT
    // Event 02 DOES NOT provide cuentaBeneficiaria (CLABE); it provides the "contract."
    // We need to find which local account has that Kuspit contract.
    const account = await prisma.account.findFirst({
      where: {
        accountSetting: {
          some: {
            kuspitContractId: contrato,
          },
        },
      },
      include: {
        // Traemos una CLABE cualquiera del usuario para llenar el campo idReceiverClabe
        // (Requerido por FK en Movement), aunque el dinero no haya entrado.
        stpAccountClabe: {
          take: 1,
        },
      },
    })

    if (!account) {
      logger.error({ ...logContext, contrato }, '🚨 Deposit rejected for Unknown Contract. Cannot link to user.')
      return
    }

    // We get the receiver CLABE id
    const receiverClabeId = account.stpAccountClabe[0]?.id

    if (!receiverClabeId) {
      logger.error({ ...logContext, accountId: account.id }, 'User has no CLABE assigned to link the rejection record.')
      return
    }

    // 3. REGISTER THE FAILED TRANSACTION
    // We don’t use a transaction because we’re not touching the account balance.
    await prisma.movement.create({
      data: {
        idAccount: account.id,
        idMovementType: 2, // Deposit
        idMovementStatus: 3, // 3 = REJECTED

        trackingKey: claveRastreo,
        amount: Number(monto),

        // Information of the transaction
        paymentConcept: conceptoPago,
        reference: 'REJECTED_DEPOSIT', // Default reference
        business: 'Kuspit', // Default business

        // Relationshios
        idReceiverClabe: receiverClabeId,
        idSenderClabe: 1, // Generic ID (Unknown)

        // Meta info
        idMovementBank: claveRastreo,

        // Financial Data
        commission: 0,
        utility: 0,
        deposit: 0,
        currentBalance: account.balance, // The balance stays the same
      },
    })

    logger.info({ ...logContext, accountId: account.id, causa: causaDevolucion }, '✅ Rejection recorded successfully')
  }

  /**
   * Processes Event 03: Validated Documents (KYC Approved)
   * Kuspit confirms that the documentation is correct.
   */
  static async handleDocumentsValidated(
    data: DocumentUpdateData,
    logContext: {
      webhookId: string
      folioInterno: string
      evento: '03'
    },
  ) {
    const { contrato, documentos } = data

    logger.info({ ...logContext }, '📄 Processing Documents Validation...')

    // 1. SEARCH FOR USER BY CONTRACT
    // Here it is STRICTLY necessary to have the contract already saved.
    const settings = await prisma.accountSetting.findFirst({
      where: { kuspitContractId: Number(contrato) },
      include: { account: true },
    })

    if (!settings || !settings.account) {
      // If we can't find the contract, we can't know who these documents belong to.
      // Event 08 probably hasn't happened yet.
      logger.warn({ ...logContext, contrato }, '⚠️ Documents validated for unknown Contract ID (Event 08 might be pending).')
      return
    }

    const accountId = settings.idAccount

    // 2. ACTUALIZAR ESTADO DE DOCUMENTOS
    // Iteramos sobre los documentos aprobados para logs o lógica específica
    const docNames = documentos.map(d => d.documento).join(', ')

    await prisma.$transaction(async (tx) => {
      // OPCIÓN A: Marcar flags específicos si tienes columnas para ello
      // await tx.account.update({
      //   where: { id: accountId },
      //   data: {
      //      isCurpVerified: documentos.some(d => d.documento === 'CURP'),
      //      isContractSigned: documentos.some(d => d.documento.includes('Contrato')),
      //   }
      // })

      // OPCIÓN B: Actualizar estatus general de Onboarding (Recomendado)
      // Si ya validaron docs, pasamos al siguiente paso (ej. 'ACTIVE' o 'READY_TO_FUND')
      await tx.account.update({
        where: { id: accountId },
        data: {
          // Asumiendo que tienes un campo de estatus o metadata
          // onboardingStatus: 'DOCS_APPROVED',

          // O guardar un log en un campo JSON
          // info: `Documentos validados por Kuspit: ${docNames}`,
        },
      })

      // Si tienes una tabla de 'UserDocuments', aquí podrías actualizarlos uno por uno
    })

    logger.info({ ...logContext, accountId, docs: docNames }, '✅ User documents marked as VALID.')
  }

  /**
   * Process Event 06: Successful Transfer (SPEI Settled)
   * We confirmed the transaction that was PENDING -> COMPLETED.
   */
  static async handleSpeiSuccess(
    data: SuccessfulTransferData,
    logContext: {
      webhookId: string
      folioInterno: string
      evento: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
    },
  ) {
    const { claveRastreo, idEstatusTransferencia, fechaOperacion } = data

    logger.info({ ...logContext, fechaOperacion, idEstatusTransferencia }, '✅ Processing Successful SPEI confirmation...')

    // 1. SEARCH FOR THE ORIGINAL MOVEMENT
    // We use the trackingKey that we generated ourselves (e.g., TMKL...) and that Kuspit returned to us.
    const movement = await prisma.movement.findFirst({
      where: { trackingKey: claveRastreo },
    })

    if (!movement) {
      logger.error({ ...logContext, claveRastreo }, '🚨 Webhook received for non-existent movement with tracking key')
      return
    }

    // 2. IDEMPOTENCE
    // If it is already in status 1 (COMPLETED), we do nothing.
    if (movement.idMovementStatus === 1) {
      logger.info({ ...logContext }, '⏭️ Transfer already confirmed. Skipping.')
      return
    }

    // 3. UPDATE TO COMPLETED
    // We only change the status. The balance was already deducted when the transfer was done.
    await prisma.movement.update({
      where: { id: movement.id },
      data: {
        idMovementStatus: 1, // 1 = COMPLETED / LIQUIDADO
      },
    })

    logger.info({ ...logContext, movementId: movement.id }, '🎉 Transfer successfully finalized')
  }

  /**
   * Processes Event 07: Failed Transfer (Error when attempting to send)
   * CRITICAL ACTION: We must return the money to the user (Rollback).
   */
  static async handleSpeiFailure(
    data: FailedTransferData,
    logContext: {
      webhookId: string
      folioInterno: string
      evento: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
    },
  ) {
    const { claveRastreo, descripcionError, causaDevolucion } = data

    logger.warn({ ...logContext, descripcionError, causaDevolucion }, '⛔ Processing SPEI Failure (Rollback needed)...')

    // 1. SEARCH FOR THE MOVEMENT
    const movement = await prisma.movement.findFirst({
      where: { trackingKey: claveRastreo },
    })

    const account = movement?.idAccount

    if (!movement || !account) {
      logger.error({ ...logContext, claveRastreo }, '🚨 Webhook received for non-existent tracking key')
      return
    }

    // 2. IDEMPOTENCY
    // If it is already marked as Failed (3) or Returned (2), we do nothing.
    if (movement.idMovementStatus === 3 || movement.idMovementStatus === 2) {
      logger.info({ ...logContext }, '⏭️ Failure already processed. Skipping.')
      return
    }

    // If for some strange reason it shows as SUCCESSFUL (1), it is a critical inconsistency alert
    if (movement.idMovementStatus === 1) {
      logger.error({ ...logContext }, '🔥 CRITICAL: Received Failure for a transaction marked as SUCCESS in DB')
      return
    }

    // 3. CALCULATE REFUND
    // We must return the Amount + The Fee we charged (if applicable)
    const amountToRefund = movement.amount
    const commissionToRefund = movement.commission || 0
    const totalRefund = amountToRefund.add(commissionToRefund)

    // 4. REFUND TRANSACTION (ROLLBACK)
    await prisma.$transaction(async (tx) => {
      // A. Return money to the account
      const updatedAccount = await tx.account.update({
        where: { id: account },
        data: { balance: { increment: totalRefund } },
      })

      // B. Update Transaction to FAILED
      await tx.movement.update({
        where: { id: movement.id },
        data: {
          idMovementStatus: 3, // 3 = FAILED / ERROR
          currentBalance: updatedAccount.balance, // We update the final balance in the history
        },
      })
    })

    logger.warn({ ...logContext, userId: movement.idAccount, refund: totalRefund }, '💸 Refund applied successfully due to SPEI Failure')
  }

  /**
   * Process Event 08: Authorized Contract / CLABE Assignment
   * We link the CLABE generated by Kuspit to the user's local account.
   */
  static async handleContractAuthorization(
    data: AuthorizedContractData,
    logContext: {
      webhookId: string
      folioInterno: string
      evento: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
    },
  ) {
    const { clabe, contrato, nombre, estatusContrato } = data
    // CLABE Placeholder used in error 202
    const PENDING_CLABE = '111111111111111111'

    logger.info({ ...logContext, estatusContrato }, '🆕 Processing Contract Authorization & CLABE Assignment...')

    let accountId: number | null = null
    let accountSettingId: number | null | undefined = null
    let isRescueOperation = false

    // ---------------------------------------------------------
    // ATTEMPT 1: DIRECT SEARCH (Happy Path)
    // ---------------------------------------------------------
    const settings = await prisma.accountSetting.findFirst({
      where: { kuspitContractId: contrato },
      include: { account: true },
    })

    if (settings?.account) {
      accountId = settings.idAccount
      accountSettingId = settings.id
    }

    // ---------------------------------------------------------
    // ATTEMPT 2: RESCUE SEARCH (Case 202 Pending)
    // ---------------------------------------------------------
    // If we don't find them by contract, we look for someone who:
    // 1. Has the placeholder CLABE (11111...)
    // 2. Matches the Name that Kuspit sends us
    if (!accountId) {
      logger.warn({ ...logContext }, '⚠️ Contract ID not found. Attempting pending user rescue...')

      const pendingUser = await prisma.account.findFirst({
        where: {
          bankAccount: PENDING_CLABE,
          commerceName: nombre,
        },
        include: { accountSetting: true },
      })

      if (pendingUser) {
        logger.info({ ...logContext, userId: pendingUser.id }, '✅ Orphaned Pending User found! Linking now.')
        accountId = pendingUser.id
        // Asumimos que tiene settings (creados vacíos o parciales antes)
        accountSettingId = pendingUser.accountSetting[0]?.id
        isRescueOperation = true
      }
    }

    // IF BOTH ATTEMPTS FAIL -> CRITICAL ERROR (It shouldn't)
    if (!accountId) {
      logger.error({ ...logContext, contrato, nombre }, '🚨 FATAL: Contract authorized but no matching local user found (Check Name match).')
      return
    }

    // 2. IDEMPOTENCY (Do we already have this CLABE saved?)
    // A. Does the CLABE already exist in the system?
    const existingClabe = await prisma.clabe.findFirst({
      where: { clabe: clabe },
    })

    // B. Si existe, ¿ya está vinculada a ESTA cuenta?
    if (existingClabe) {
      const existingLink = await prisma.stpAccountClabe.findFirst({
        where: {
          idAccount: accountId,
          idClabe: existingClabe.id,
        },
      })

      // Si ya tenemos la CLABE y el Link, el trabajo ya se hizo antes.
      if (existingLink) {
        logger.info({ ...logContext, accountId }, 'ℹ️ CLABE already registered.')
        return // SALIR
      }
    }

    // 3. PREPARE DATA
    const institutionCode = 69
    const bank = await prisma.institution.findFirst({ where: { code: institutionCode } })
    const bankId = bank?.id ?? 1 // Fallback

    // Account Type 40 (CLABE)
    const typeRecord = await prisma.clabeType.findFirst({ where: { code: 40 } })
    const clabeTypeId = typeRecord?.id ?? 1

    // 4. DB TRANSACTION
    await prisma.$transaction(async (tx) => {
      // A. Save Contract ID (If coming from rescue)
      if (isRescueOperation && accountSettingId) {
        await tx.accountSetting.update({
          where: { id: accountSettingId },
          data: { kuspitContractId: contrato },
        })
      }

      let finalClabeId = existingClabe?.id

      // B. Create CLABE (Only if it didn’t exist in step 2)
      if (!finalClabeId) {
        const newClabe = await tx.clabe.create({
          data: {
            clabe: clabe,
            ownerName: nombre,
            idInstitution: bankId,
            idClabeType: clabeTypeId,
          },
        })
        finalClabeId = newClabe.id
      }

      // C. Clear Placeholder and Create Link
      // 1. Delete any link to the placeholder (1111...) for this account
      await tx.stpAccountClabe.deleteMany({
        where: {
          idAccount: accountId,
          clabe: { clabe: PENDING_CLABE },
        },
      })

      // 2. Create the new link to the Real CLABE
      // We use 'create' because the idempotency check above ensures that the link does not exist
      await tx.stpAccountClabe.create({
        data: {
          idAccount: accountId!,
          idClabe: finalClabeId!,
        },
      })

      // D. Update the account
      await tx.account.update({
        where: { id: accountId! },
        data: { bankAccount: clabe },
      })
    })

    logger.info({ ...logContext, accountId, clabe }, '✅ CLABE assigned and linked to user successfully')
  }

  /**
   * Process Event 09: SPEI Return (The money returned from the destination bank)
   * Refund to the user and status update.
   */
  static async handleSpeiReturn(
    data: SpeiReturnData,
    logContext: {
      webhookId: string
      folioInterno: string
      evento: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
    },
  ) {
    const {
      claveRastreoOriginal,
      claveRastreoDevolucion,
      montoDevolucion,
      causaDevolucion,
    } = data

    logger.warn({ ...logContext }, '↩️ Processing SPEI Return (Money came back)...')

    // 1. FIND ORIGINAL MOVEMENT
    // We look for the shipment we originally sent
    const movement = await prisma.movement.findFirst({
      where: { trackingKey: claveRastreoOriginal },
    })

    const account = movement?.idAccount

    if (!movement || !account) {
      logger.error({ ...logContext, claveRastreoOriginal }, '🚨 Return received for non-existent transaction.')
      return
    }

    // 2. IDEMPOTENCE
    // We check whether it is already marked as Returned (2) or Failed (3)
    if (movement.idMovementStatus === 2 || movement.idMovementStatus === 3) {
      logger.info({ ...logContext }, '⏭️ Return already processed. Skipping.')
      return
    }

    // 3. CALCULATE REFUND
    // We refund what the bank returns + the commission we originally charged
    const commissionToRefund = Number(movement.commission || 0)
    const totalRefund = Number(montoDevolucion) + commissionToRefund

    // 4. REFUND TRANSACTION
    await prisma.$transaction(async (tx) => {
      // A. Return balance to the account
      const updatedAccount = await tx.account.update({
        where: { id: account },
        data: { balance: { increment: totalRefund } },
      })

      // B. Update the original transaction
      // We use status 4 (RETURNED) to distinguish it from a technical failure (3)
      await tx.movement.update({
        where: { id: movement.id },
        data: {
          idMovementStatus: 2, // 2 = RETURNED
          currentBalance: updatedAccount.balance, // Update the balance
          // Save the reference of the refund
          idMovementBank: claveRastreoDevolucion,
          paymentConcept2: `${causaDevolucion}`,
        },
      })
    })

    logger.info({ ...logContext, userId: movement.idAccount, refund: totalRefund }, '💸 SPEI Return processed and refunded.')
  }

  /**
   * Process Event 10: Internal Refund
   * Kuspit rejected the operation internally. The user is refunded.
   */
  static async handleInternalReturn(
    data: InternalReturnData,
    logContext: {
      webhookId: string
      folioInterno: string
      evento: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
    },
  ) {
    const {
      claveRastreo,
      claveRastreoDevolucion,
      monto,
      causaDevolucion,
      conceptoPago,
    } = data

    logger.warn({ ...logContext }, '🔄 Processing Internal Return (Kuspit Reversal)...')

    // 1. SEARCH ORIGINAL MOVEMENT
    const movement = await prisma.movement.findFirst({
      where: { trackingKey: claveRastreo },
    })

    const account = movement?.idAccount

    if (!movement || !account) {
      logger.error({ ...logContext, claveRastreo }, '🚨 Internal Return for non-existent transaction.')
      return
    }

    // 2. IDEMPOTENCE
    // If it is already 3 (Failed) or 2 (Returned), exit.
    if (movement.idMovementStatus === 3 || movement.idMovementStatus === 4) {
      logger.info({ ...logContext }, '⏭️ Internal return already processed.')
      return
    }

    // 3. CALCULATE REFUND
    // We return Amount + Commission
    const commissionToRefund = Number(movement.commission || 0)
    const totalRefund = Number(monto) + commissionToRefund

    // 4. TRANSACTION (ROLLBACK)
    await prisma.$transaction(async (tx) => {
      // A. Refund Balance
      const updatedAccount = await tx.account.update({
        where: { id: account },
        data: { balance: { increment: totalRefund } },
      })

      // B. Update Movement
      // We use status 2 (RETURNED).
      await tx.movement.update({
        where: { id: movement.id },
        data: {
          idMovementStatus: 2, // 2 = Returned
          currentBalance: updatedAccount.balance,
          // Save the reference of the refund
          idMovementBank: claveRastreoDevolucion,
          paymentConcept2: `${conceptoPago} - ${causaDevolucion}`,
        },
      })
    })

    logger.warn({ ...logContext, userId: movement.idAccount, refund: totalRefund }, '💸 Internal Return applied successfully.')
  }
}
