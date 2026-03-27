import { prisma } from '../shared/prisma.ts'
import { AppError } from '../shared/error-handler.ts'
import { KuspitAuthService } from './auth.service.ts'
import type { LegacyJavaDate, Position } from '../adapter/kuspit/bank.ts'
import type { GetMovementsDTO, MakeTransferDTO, MakeWithdrawalDTO, RegisterProviderDTO, UpdateBankInfoDTO } from '../schemas/bank.schema.ts'
import { randomUUID } from 'crypto'
import { logger } from '../shared/logger.ts'
import { BusinessRules } from '../shared/business-rules.ts'
import { calculateCommission, getPlan } from '../shared/commission.ts'
import { adapter } from '../adapter/kuspit.adapter.ts'
import { KUSPIT_ACTION_TYPE } from '../shared/kuspit-catalog.ts'
import { appConfig } from '../config/config.instance.ts'

/*
 * HELPER - Sanitize Java Legacy Dates
 */
const parseLegacyDate = (legacyDate: LegacyJavaDate | null): string | null => {
  if (!legacyDate || !legacyDate.time) return null
  return new Date(legacyDate.time).toISOString()
}

export const KuspitBankService = {

  /*
   * HELPER - Sanitize Failed Position Result
   */
  _getEmptyPortfolio(): Position {
    return {
      resumen: { gananciaPerdida: 0, rendimientoPortafolio: 0, costo: 0, posicion: 0 },
      efectivo: { efectivo: 0 },
      titulos: { costoTitulos: 0, serie: '', variacionPrecio: 0, tipoValor: '', emisora: '', gananciaPerdida: 0, precio: 0, variacionPorcentaje: 0, gananciaPerdidaPrecio: 0, valorhoyEnTitulos: 0, costoUnitario: 0, titulos: 0, alzabaja: 0, gananciaPerdidaPorcentaje: 0 },
    }
  },

  /**
   * Obtains and formats the investment portfolio.
   */
  async getPortfolioPosition(localAccountId: number): Promise<Position> {
    // 1. Obtain Valid Session (Handles automatic refresh token)
    const session = await KuspitAuthService.getValidSession(localAccountId)

    // 2. Obtain Contract
    const account = await prisma.accountSetting.findFirst({
      where: { idAccount: localAccountId },
      select: {
        kuspitContractId: true,
      },
    })

    if (!account?.kuspitContractId) {
      throw new AppError(400, 'The account does not have an active contract linked to it.')
    }

    // 3. Call to Adapter
    const rawData = await adapter.getPosition(account.kuspitContractId, session.accessToken)

    // 4. SMART MAPPING (Data Transformation)
    // We validate that the array has the minimum expected structure
    if (!Array.isArray(rawData) || rawData.length < 2) {
      // We return a secure empty structure if Kuspit fails or returns empty.
      return this._getEmptyPortfolio()
    }

    // Index 0: Resumen
    const rawSummary = rawData[0] as Position['resumen']

    // Index 1: Efectivo
    const rawCash = rawData[1] as Position['efectivo']

    // Index 2: Titulos
    const rawAssets = rawData[2] ? (rawData[2] as Position['titulos']) : null

    // Helper for safely parsing floats from strings
    const parse = (val: string | number | undefined) => {
      if (val === undefined || val === null) return 0
      return typeof val === 'string' ? parseFloat(val) : val
    }

    return {
      resumen: {
        gananciaPerdida: parse(rawSummary.gananciaPerdida),
        rendimientoPortafolio: parse(rawSummary.rendimientoPortafolio),
        costo: parse(rawSummary.costo),
        posicion: parse(rawSummary.posicion),
      },
      efectivo: {
        efectivo: parse(rawCash.efectivo),
      },
      titulos: rawAssets
        ? {
            costoTitulos: parse(rawAssets.costoTitulos),
            serie: rawAssets.serie,
            variacionPrecio: parse(rawAssets.variacionPrecio),
            tipoValor: rawAssets.tipoValor,
            emisora: rawAssets.emisora,
            gananciaPerdida: parse(rawAssets.gananciaPerdida),
            precio: parse(rawAssets.precio),
            variacionPorcentaje: parse(rawAssets.variacionPorcentaje),
            gananciaPerdidaPrecio: parse(rawAssets.gananciaPerdidaPrecio),
            valorhoyEnTitulos: parse(rawAssets.valorhoyEnTitulos),
            costoUnitario: parse(rawAssets.costoUnitario),
            titulos: parse(rawAssets.titulos),
            alzabaja: parse(rawAssets.alzabaja),
            gananciaPerdidaPorcentaje: parse(rawAssets.gananciaPerdidaPorcentaje),
          }
        : {
            costoTitulos: 0,
            serie: '',
            variacionPrecio: 0,
            tipoValor: '',
            emisora: '',
            gananciaPerdida: 0,
            precio: 0,
            variacionPorcentaje: 0,
            gananciaPerdidaPrecio: 0,
            valorhoyEnTitulos: 0,
            costoUnitario: 0,
            titulos: 0,
            alzabaja: 0,
            gananciaPerdidaPorcentaje: 0,
          },
    }
  },

  async getLiquidAssets(localAccountId: number) {
    const session = await KuspitAuthService.getValidSession(localAccountId)
    const account = await prisma.accountSetting.findFirst({
      where: { idAccount: localAccountId },
      select: { kuspitContractId: true },
    })
    if (!account?.kuspitContractId) {
      throw new AppError(400, 'The account does not have an active contract linked to it.')
    }
    const idEmpresa = appConfig.get<string>('kuspit.idEmpresa') || ''
    const rawData = await adapter.getLiquidAssets({
      contrato: account.kuspitContractId,
      empresa: idEmpresa,
      token: session.accessToken,
    })
    return rawData
  },

  /**
   * Manage the registration/cancellation of destination accounts.
   */
  async registerProvider(localAccountId: number, data: RegisterProviderDTO) {
    // 1. Obtener Sesión y Contrato
    const session = await KuspitAuthService.getValidSession(localAccountId)

    const account = await prisma.account.findUnique({
      where: { id: localAccountId },
      include: { accountSetting: true },
    })

    if (!account?.accountSetting[0]?.kuspitContractId) throw new AppError(400, 'Account without an active contract.')

    // 2. Set up environment variables and ID logic
    const idEmpresa = appConfig.get<string>('kuspit.idEmpresa') || ''
    let idProveedorKuspit = undefined // Default for ‘A’ (REGISTER) is undefined

    // 3. If it is CANCELLATION or CHANGE, we need to search for the actual Kuspit ID in our DB.
    if (data.accion === 'B' || data.accion === 'C') {
      if (!data.idBeneficiarioLocal) {
        throw new AppError(400, 'For cancellations or changes, the provider\'s local ID is required.')
      }

      const existingBeneficiary = await prisma.clabe.findFirst({
        where: { id: data.idBeneficiarioLocal,
          savedAccounts: {
            some: {
              idAccount: localAccountId,
            },
          },
        },
        include: {
          savedAccounts: true,
        },
      })

      if (!existingBeneficiary || !existingBeneficiary.savedAccounts[0]?.kuspitProviderId) {
        throw new AppError(404, 'Beneficiary not found or not synchronized with Kuspit ID.')
      }

      // We retrieve the ID that Kuspit gave us when we created it.
      idProveedorKuspit = existingBeneficiary.savedAccounts[0]?.kuspitProviderId
    }

    // 4. Build Payload (Cast to Strings)
    const payload = {
      contrato: account?.accountSetting[0]?.kuspitContractId,
      empresa: idEmpresa,
      accion: data.accion,
      idProveedor: idProveedorKuspit,
      nombreProveedor: data.nombreProveedor,
      rfc: data.rfc,
      idBanco: data.idBanco,
      tipoCuenta: data.tipoCuenta,
      cuenta: data.cuenta,
    }

    // 5. Call to Adapter
    const kuspitResponse = await adapter.registerProvider({ ...payload, token: session.accessToken })

    // 6. Update the Local DB (Sync)
    // We use transacion or simple logic depending on the action

    if (data.accion === 'A') {
      // --- REGISTER: Save the new provider ---
      const bankRecord = await prisma.institution.findFirst({
        where: {
          code: data.idBanco,
        },
      })

      if (!bankRecord) {
        throw new AppError(400, `The bank with code ${data.idBanco} is not registered in the local catalog.`)
      }
      const typeRecord = await prisma.clabeType.findFirst({
        where: { code: data.tipoCuenta },
      })

      if (!typeRecord) {
        throw new AppError(400, `The type of CLABE ${data.tipoCuenta} is not registered in the local catalog.`)
      }
      const newBeneficiary = await prisma.clabe.create({
        data: {
          ownerName: data.nombreProveedor,
          ownerRfcCurp: data.rfc,
          idInstitution: bankRecord.id,
          idClabeType: typeRecord.id,
          clabe: data.cuenta,
          // status: 'ACTIVE',
        },
      })

      await prisma.savedAccounts.create({
        data: {
          idAccount: localAccountId,
          idClabe: newBeneficiary.id,
          // ⚠️ CRITICAL: We save the ID returned by Kuspit.
          kuspitProviderId: Number(kuspitResponse.idProveedor),
        },
      })

      return { ...kuspitResponse, localId: newBeneficiary.id }
    }
    else if (data.accion === 'B') {
      // --- CANCELLATION: We delete or mark as inactive ---
      if (!data.idBeneficiarioLocal) {
        throw new AppError(400, 'For cancellations, the provider\'s local ID is required.')
      }
      const cancelledClabe = await prisma.clabe.update({
        where: {
          id: data.idBeneficiarioLocal,
        },
        data: { deletedAt: new Date() },
      })
      await prisma.stpAccountClabe.deleteMany({
        where: {
          idClabe: cancelledClabe.id,
          idAccount: account.id,
        },
      })
      return { ...kuspitResponse, localId: data.idBeneficiarioLocal }
    }
    else {
      // --- CHANGE: Update data ---
      if (!data.idBeneficiarioLocal) {
        throw new AppError(400, 'For changes, the provider\'s local ID is required.')
      }
      const bankRecord = await prisma.institution.findFirst({
        where: {
          code: data.idBanco,
        },
      })

      if (!bankRecord) {
        throw new AppError(400, `The bank with code ${data.idBanco} is not registered in the local catalog.`)
      }
      await prisma.clabe.update({
        where: { id: data.idBeneficiarioLocal },
        data: {
          ownerName: data.nombreProveedor,
          clabe: data.cuenta,
          idInstitution: bankRecord.id,
        },
      })
      return { ...kuspitResponse, localId: data.idBeneficiarioLocal }
    }
  },

  async makeTransfer(localAccountId: number, data: MakeTransferDTO) {
    // 1. Get session, contract and SENDER information
    // We need the Sender CLABE to calculate commissions (rate counting)
    const session = await KuspitAuthService.getValidSession(localAccountId)

    const account = await prisma.account.findUnique({
      where: { id: localAccountId },
      include: {
        accountSetting: true,
        plans: true,
        stpAccountClabe: {
          include: {
            clabe: {
              include: { costCenter: true },
            },
          },
        },
      },
    })

    const settings = account?.accountSetting[0]
    const senderClabeData = account?.stpAccountClabe[0]?.clabe
    const businessName = senderClabeData?.costCenter?.name ?? 'Espiral'

    // Business Rule: Service Hours
    if (!account?.service24 && !BusinessRules.isServiceOpen()) {
      throw new AppError(400, 'Hours of operation: Monday to Friday from 9:00 a.m. to 8:00 p.m. (Mexico City).')
    }

    if (!settings?.kuspitContractId) {
      throw new AppError(400, 'Account without an active contract to make transfers.')
    }

    if (!senderClabeData) {
      throw new AppError(400, 'Account does not have a valid CLABE assigned.')
    }

    // 2. Calculate Commissions
    // We fetch the specific RATE based on transaction volume
    const rate = await getPlan(
      senderClabeData.id, // Passed Clabe ID
      0, // Add transactions
      Number(account.cutOffDay || 1),
      account.idCommerce,
    )

    const fees = await calculateCommission(data.monto, rate)

    const donationAmount = Number(data.donation || 0)

    // CRITICAL: The total to deduct is Amount + Commission + Donation
    const totalDeduction = data.monto + fees.commission + donationAmount

    // 3. Balance validation (Preventive)
    // We check local balance first. Assuming 'account.balance' is a source of truth:
    const currentBalance = Number(account.balance)

    if (currentBalance < totalDeduction) {
      throw new AppError(400, `Insufficient funds. Required: $${totalDeduction.toFixed(2)} (Amount + Fees). Available: $${currentBalance.toFixed(2)}`)
    }

    // Common payload for Kuspit endpoints
    const commonPayload = {
      contrato: settings.kuspitContractId,
      empresa: appConfig.get<string>('kuspit.idEmpresa') || '',
      token: session.accessToken,
    }

    // ---------------------------------------------------------
    // STEP A: PROVIDER REGISTRATION (Always attempted or recovered)
    // ---------------------------------------------------------
    let kuspitProviderId: number | undefined

    // 4. Resolve Provider (Receiver)
    const provider = await prisma.clabe.findFirst({
      where: {
        clabe: data.cuentaBeneficiario,
        savedAccounts: { some: { idAccount: localAccountId } },
      },
      include: {
        savedAccounts: true,
      },
    })

    if (provider && provider.savedAccounts[0]?.kuspitProviderId) {
      kuspitProviderId = provider.savedAccounts[0].kuspitProviderId
    }
    else {
      const registerPayload = {
        ...commonPayload,
        accion: 'A' as const,
        nombreProveedor: data.nombreBeneficiario,
        rfc: data.rfcCurpBeneficiario !== 'ND' ? data.rfcCurpBeneficiario : '', // Ojo con ND
        idBanco: data.institucionContraparte,
        tipoCuenta: data.tipoCuentaBeneficiario,
        cuenta: data.cuentaBeneficiario,
      }

      logger.info({ localAccountId }, 'Registering provider in Kuspit (Action A)...')
      const registerRes = await adapter.registerProvider(registerPayload)
      kuspitProviderId = registerRes.idProveedor
    }

    if (!kuspitProviderId) {
      throw new AppError(500, 'Failed to obtain a Provider ID from Kuspit.')
    }

    // 5. Generate tracking key
    // Format: T + Timestamp + Random
    const timestamp = Date.now().toString(36).toUpperCase() // ~8 chars (Ej. LRP52X0)
    const random = randomUUID().replace(/-/g, '').substring(0, 5).toUpperCase() // 5 random chars

    const uniqueRef = `T${timestamp}${random}`

    // ---------------------------------------------------------
    // STEP B: BALANCE AND DB UPDATE (Transaction)
    // ---------------------------------------------------------

    // 6. Persistence & Accounting (Atomic Transaction)
    // We must update balance and create movement and provider simultaneously
    const transfer = await prisma.$transaction(async (tx) => {
      // A. Deduct Money
      await tx.account.update({
        where: { id: localAccountId },
        data: {
          balance: { decrement: totalDeduction },
        },
      })

      // Translate Bank Id
      const bankRecord = await tx.institution.findFirst({
        where: {
          code: data.institucionContraparte,
        },
      })

      if (!bankRecord) {
        throw new AppError(400, `The bank with code ${data.institucionContraparte} is not registered in the local catalog.`)
      }

      // Translate Type CLABE ID
      const typeRecord = await tx.clabeType.findFirst({
        where: { code: data.tipoCuentaBeneficiario },
      })

      if (!typeRecord) {
        throw new AppError(400, `The type of CLABE ${data.tipoCuentaBeneficiario} is not registered in the local catalog.`)
      }

      // B. Create Provider CLABE and link to the account
      let receiverClabe = await tx.clabe.findFirst({
        where: { clabe: data.cuentaBeneficiario },
      })
      if (!receiverClabe) {
        receiverClabe = await tx.clabe.create({
          data: {
            clabe: data.cuentaBeneficiario,
            ownerName: data.nombreBeneficiario,
            idInstitution: bankRecord.id,
            idClabeType: typeRecord.id,
            ownerRfcCurp: data.rfcCurpBeneficiario !== 'ND' ? data.rfcCurpBeneficiario : '',
          },
        })
      }
      else {
        await tx.clabe.update({
          where: { id: receiverClabe.id },
          data: {
            ownerName: data.nombreBeneficiario,
          },
        })
      }

      // C. Link Saved Account (UPSERT Logic)
      await tx.savedAccounts.upsert({
        where: {
          idAccount_idClabe: {
            idAccount: localAccountId,
            idClabe: receiverClabe.id,
          },
        },
        update: { kuspitProviderId: Number(kuspitProviderId) },
        create: {
          idAccount: localAccountId,
          idClabe: receiverClabe.id,
          kuspitProviderId: Number(kuspitProviderId),
        },
      })

      // D. Create Movement Record
      const transaction = await tx.movement.create({
        data: {
          idAccount: localAccountId,
          idMovementType: 1, // SPEI Out
          idMovementStatus: 4, // COMPLETED - WAITING (Since we got '1000')

          // Link Sender and Receiver
          idSenderClabe: senderClabeData.id,
          idReceiverClabe: receiverClabe.id,

          // Financials
          amount: data.monto,
          commission: fees.commission,
          utility: fees.utility, // Your net profit
          deposit: fees.deposit, // What the receiver gets (net)

          // Meta
          trackingKey: uniqueRef,
          reference: data.referenciaNumerica,
          paymentConcept: data.conceptoPago,

          // Audit
          latitud: data.latitud,
          longitud: data.longitud,

          // Business identifier
          business: businessName,

          // Snapshot of balance after deduction
          currentBalance: currentBalance - totalDeduction,
        },
      })

      // C. Save Donation
      //   if (donationAmount > 0) {

      //   }

      return transaction
    })

    // ---------------------------------------------------------
    // STEP C: MAKE TRANSFER
    // ---------------------------------------------------------

    // 7. Construct payload
    const payload = {
      ...commonPayload,
      idProveedorTercero: kuspitProviderId,
      monto: data.monto,
      referencia: data.referenciaNumerica || '0000000',
      concepto: data.conceptoPago,
      claveRastreo: uniqueRef,
      latitud: data.latitud,
      longitud: data.longitud,
    }

    // 8. Call to Adapter
    // It is important to log this attempt in case of timeouts
    logger.info({ localAccountId, amount: data.monto, ref: uniqueRef }, 'Initializing Kuspit transfer...')

    const response = await adapter.makeTransfer(payload)

    // 9. Validate Response
    if (response.estatus !== '1000') {
      logger.error({ response }, 'Transfer rejected by Kuspit')
      await prisma.$transaction([
        prisma.account.update({
          where: { id: localAccountId },
          data: { balance: { increment: totalDeduction } },
        }),
        prisma.movement.update({
          where: { id: transfer.id },
          data: { idMovementStatus: 3 }, // 3 = FAILED
        }),
      ])
      // Return the specific error from the provider
      throw new AppError(402, `Transfer failed: ${response.causaEstatus || response.estatus || 'Unknown error'}`)
    }
    else {
      await prisma.movement.update({
        where: { id: transfer.id },
        data: { idMovementBank: response.claveRastreo },
      })
    }

    logger.info({ txId: transfer.id }, '✅ Transfer successful and ledger updated.')

    return {
      success: true,
      transactionId: transfer.id,
      trackingKey: response.claveRastreo,
      amount: data.monto,
      totalDeducted: totalDeduction,
      remainingBalance: currentBalance - totalDeduction,
    }
  },

  async getTransferStatus(localTransactionId: number) {
    // 1. Search for the transaction
    const transaction = await prisma.movement.findUnique({
      where: { id: localTransactionId },
    })

    const idAccount = transaction?.idAccount

    if (!transaction) throw new AppError(404, 'Transaction not found')
    if (!idAccount) throw new AppError(400, 'Transaction has no linked account.')
    if (!transaction.trackingKey) throw new AppError(400, 'This transaction does not have a Kuspit Tracking Key (was it processed?).')

    // 2. Get session and congirutation
    const session = await KuspitAuthService.getValidSession(idAccount)

    // Get the contract ID from account settings
    const settings = await prisma.accountSetting.findFirst({
      where: { idAccount: idAccount },
    })
    if (!settings?.kuspitContractId) throw new AppError(400, 'Account contract missing.')

    // 3. Prepare Params
    // Forma YYYY-MM-DD
    const dateStr = transaction.createdAt.toISOString().split('T')[0]?.replace(/-/g, '') ?? ''

    const payload = {
      contrato: settings.kuspitContractId,
      empresa: appConfig.get<string>('kuspit.clientId') || '',
      claveRastreo: transaction.trackingKey, // La clave larga de Kuspit
      fechaOperacion: dateStr,
      referencia: transaction.reference || undefined,
    }

    // 4. Call to Adapter
    const statusData = await adapter.getTransferStatus({ ...payload, token: session.accessToken })

    // 5. Status Logic
    // Extract first character of status code (2 - Successful / 3 - Returned)
    const statusCode = statusData.estatus.charAt(0)

    // --- CASE A: SUCCESSFUL ---
    if (statusCode === '2') {
      // If it has alreadu been marked as completed, we do nothing (idempotence).
      if (transaction.idMovementStatus !== 2) { // 4 = COMPLETED
        await prisma.movement.update({
          where: { id: transaction.id },
          data: {
            idMovementStatus: 2, // COMPLETED
            codiInvoice: statusData.claveSpei?.toString(), // Save the ID of Banxico in CODI INVOICE
            updatedAt: new Date(),
          },
        })
      }
      return { status: 'COMPLETED', data: statusData }
    }

    // --- CASE B: RETURNED ---
    if (statusCode === '3') {
      // IMPORTANT: Idempotence.
      // If we have already marked it as returned previously, we do nothing so as not to duplicate the refund.
      if (transaction.idMovementStatus === 2 || transaction.idMovementStatus === 3) { // 5 = RETURNED/FAILED
        return { status: 'ALREADY_RETURNED', data: statusData }
      }

      // Atomic transaction to mark as returned and refund
      await prisma.$transaction(async (tx) => {
        // 1. Check the transaction as RETURNED
        await tx.movement.update({
          where: { id: transaction.id },
          data: {
            idMovementStatus: 2, // RETURNED
            // Note: idCauseOfReturn. Checar con Mario
            // Save the reason in the payment concept2
            paymentConcept2: `Refund: ${statusData.causaDevolucion}`.substring(0, 45),
            codiInvoice: statusData.claveSpei?.toString(),
          },
        })

        // 2. Return the money to the balance (Refund)
        await tx.account.update({
          where: { id: idAccount },
          data: {
            balance: { increment: transaction.amount },
          },
        })

        // 3. Create refund movement
        await tx.movement.create({
          data: {
            idAccount: idAccount,
            idMovementType: 2, // DEPOSIT / REFUND TYPE
            idMovementStatus: 4, // COMPLETED
            amount: transaction.amount,
            reference: `REFUND-${transaction.id}`,
            paymentConcept: `Devolución SPEI: ${statusData.causaDevolucion}`,
            trackingKey: statusData.claveRastreoDevolucion || `REF-${Date.now()}`,
            idSenderClabe: transaction.idReceiverClabe, // Refund comes from receiver
            idReceiverClabe: transaction.idSenderClabe, // Goes back to original sender
            business: transaction.business, // Same business context
          },
        })
      })

      logger.warn({ txId: transaction.id, reason: statusData.causaDevolucion }, '💸 Transfer returned and refunded.')

      return { status: 'RETURNED', reason: statusData.causaDevolucion }
    }

    // --- CASE C: PENDING OR UNKNOWN ---
    return { status: 'PENDING', rawStatus: statusData.estatus }
  },

  async getMovements(localAccountId: number, filters: GetMovementsDTO) {
    // 1. Get Session & Contract
    const session = await KuspitAuthService.getValidSession(localAccountId)

    const account = await prisma.account.findUnique({
      where: { id: localAccountId },
      include: { accountSetting: true },
    })

    const settings = account?.accountSetting[0]
    if (!settings?.kuspitContractId) throw new AppError(400, 'Account contract missing.')

    // 2. Call Adapter
    const payload = {
      contrato: settings.kuspitContractId,
      empresa: appConfig.get<string>('kuspit.idEmpresa') || '',
      fechaInicial: filters.fechaInicial,
      fechaFinal: filters.fechaFinal,
      tipoMovimiento: filters.tipoMovimiento as 'd' | 'r' | 't',
    }

    const rawMovements = await adapter.getAccountMovements({ ...payload, token: session.accessToken })

    // 3. Sanatize the data (Mapping)
    const cleanMovements = rawMovements.movimientos.map(mov => ({
      amount: mov.monto,
      type: mov.tipoMovimiento,
      concept: mov.concepto,
      trackingKey: mov.claveRastreo,
      status: mov.estatus,
      beneficiaryAccount: mov.cuentaBeneficiaria,
      commission: mov.comision,
      tax: mov.iva,

      // Transform Dates (Epoch -> ISO String) - Standarizeds
      orderDate: parseLegacyDate(mov.fechaOrden),
      settlementDate: parseLegacyDate(mov.fechaLiquidacion),
    }))

    return cleanMovements
  },

  async makeWithdrawal(localAccountId: number, data: MakeWithdrawalDTO) {
    // 1. Get Session and Contract
    const session = await KuspitAuthService.getValidSession(localAccountId)

    const account = await prisma.account.findUnique({
      where: { id: localAccountId },
      include: { accountSetting: true,
        savedAccounts: {
          include: { clabe: true },
        },
        stpAccountClabe: {
          include: { clabe: true },
        },
      },
    })

    const settings = account?.accountSetting[0]
    if (!settings?.kuspitContractId) throw new AppError(400, 'Account contract missing.')

    const senderClabe = account?.stpAccountClabe
      .map(rel => rel.clabe)
      .find(c => c.idInstitution === 69)

    if (!senderClabe) {
      throw new AppError(500, 'The Kuspit CLABE code for this account was not found.')
    }

    const receiverClabe = account?.savedAccounts
      .find(rel => rel.kuspitProviderId === 1)
      ?.clabe

    if (!receiverClabe) {
      throw new AppError(400, 'No external master account was found to execute the withdrawal.')
    }

    // 2. Preventive Balance Validation (NO RNF Errors)
    const position = await adapter.getPosition(settings.kuspitContractId, session.accessToken)

    // “Efectivo” is what you can actually withdraw (Available Cash)
    const availableBalance = position.efectivo.efectivo || 0

    if (data.monto > availableBalance) {
      throw new AppError(400, `Insufficient funds. Available to withdraw: $${availableBalance.toFixed(2)}`)
    }

    // 3. Execute Withdrawal
    const payload = {
      contrato: settings.kuspitContractId,
      empresa: appConfig.get<string>('kuspit.idEmpresa') || '',
      monto: Number(data.monto.toFixed(2)),
      concepto: data.concepto,
      latitud: data.latitud,
      longitud: data.longitud,
    }
    const response = await adapter.makeWithdrawal({ ...payload, token: session.accessToken })

    // 4. Status Interpretation
    // REJ = Success. Anything else is an error.
    if (response.estatus !== 'REJ') {
      const errorMsg = response.causaEstatus || 'Unknown withdrawal error'
      // Mapeping of common errors for clear logging
      const codeMap: Record<string, string> = {
        RNF: 'Fondos Insuficientes (Backend Kuspit)',
        RNE: 'No Ejecutado (Error Técnico)',
        RER: 'Retiro con Error',
      }

      logger.error({ localAccountId, kuspitCode: response.estatus }, `Withdrawal Failed: ${errorMsg}`)
      throw new AppError(402, `Withdrawal rejected: ${codeMap[response.estatus] || response.estatus} - ${errorMsg}`)
    }

    // 5. Atomic Persistence (Only if it was REJ)
    const result = await prisma.$transaction(async (tx) => {
      // A. Discount Local Balance
      await tx.account.update({
        where: { id: localAccountId },
        data: {
          balance: { decrement: data.monto },
        },
      })

      // B. Registrar Movimiento
      const transaction = await tx.movement.create({
        data: {
          idAccount: localAccountId,
          idMovementType: 1,
          idMovementStatus: 1, // COMPLETED
          amount: data.monto,
          reference: 'WITHDRAWAL',
          paymentConcept: data.concepto || 'Retiro a cuenta bancaria',
          trackingKey: response.claveRastreo, // Kuspit key

          latitud: data.latitud,
          longitud: data.longitud,

          currentBalance: Number(account?.balance) - data.monto,

          idSenderClabe: senderClabe.id,
          idReceiverClabe: receiverClabe.id,
          business: 'Kuspit',
        },
      })

      return transaction
    })

    logger.info({ txId: result.id, amount: data.monto }, '✅ Withdrawal executed successfully.')

    return {
      success: true,
      transactionId: result.id,
      trackingKey: response.claveRastreo,
      amount: data.monto,
      newBalance: Number(account?.balance) - data.monto,
    }
  },

  async updateBankInfo(
    localAccountId: number,
    data: UpdateBankInfoDTO,
    file: Express.Multer.File,
  ) {
    if (!file) throw new AppError(400, 'Bank Statement file (Carátula) is required.')

    // 1. Get Session
    const session = await KuspitAuthService.getValidSession(localAccountId)

    // 2. Get Contract
    const account = await prisma.account.findUnique({
      where: { id: localAccountId },
      include: { accountSetting: true },
    })
    const settings = account?.accountSetting[0]
    if (!settings?.kuspitContractId) throw new AppError(400, 'Account contract missing.')

    const existingLink = await prisma.savedAccounts.findFirst({
      where: {
        idAccount: localAccountId,
        kuspitProviderId: 1, // Special ID for Master CLABE
      },
      include: { clabe: true },
    })

    const actionType = existingLink
      ? KUSPIT_ACTION_TYPE.CAMBIO
      : KUSPIT_ACTION_TYPE.ALTA

    // 3. Preparare File Native
    const nativeFile = new File(
      [new Uint8Array(file.buffer)],
      file.originalname,
      { type: file.mimetype },
    )

    // 4. Call to the Adapter
    const payload = {
      idEmpresa: Number(appConfig.get<string>('kuspit.idEmpresa')),
      contrato: settings.kuspitContractId,
      idBanco: data.idBanco,
      clabe: data.clabe,
      idTipoAccion: actionType,
      caratulaCuentaClaBe: nativeFile,
    }

    const response = await adapter.updateBankInfo({ ...payload, token: session.accessToken })

    // 5. Update Local DB
    const bankRecord = await prisma.institution.findFirst({
      where: {
        code: data.idBanco,
      },
    })

    if (!bankRecord) {
      throw new AppError(400, `The bank with code ${data.idBanco} is not registered in the local catalog.`)
    }

    if (existingLink) {
      // CASE A: UPDATE
      await prisma.clabe.update({
        where: { id: existingLink.clabe.id },
        data: {
          clabe: data.clabe,
          idInstitution: bankRecord.id,
        },
      })
    }
    else {
      // CASO B: CREATE (New Master CLABE)
      await prisma.$transaction(async (tx) => {
        // 1. Create the Clabe
        const newClabe = await tx.clabe.create({
          data: {
            clabe: data.clabe,
            idInstitution: bankRecord.id,
          },
        })

        // 2. Create the Relation (stpAccountClabe)
        await tx.savedAccounts.create({
          data: {
            idAccount: localAccountId,
            idClabe: newClabe.id,
            kuspitProviderId: 1, // Forced to Master Number
          },
        })
      })
    }

    return response
  },
}
