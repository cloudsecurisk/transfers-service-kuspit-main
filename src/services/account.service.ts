import { AppError } from '../shared/error-handler.ts'
import { KuspitAuthService } from './auth.service.ts'
import { fetchCommerceDetails } from '../adapter/external/commerce-service.ts'
import { adapter } from '../adapter/kuspit.adapter.ts'
import { type MoralAccountParams, type PhysicalAccountParams } from '../adapter/kuspit/account.ts'
import { type AddressCatalogResponse } from '../adapter/kuspit/utils.ts'
import { logger } from '../shared/logger.ts'
import { prisma } from '../shared/prisma.ts'
import { splitMexicanPhoneNumber } from '../shared/phone-parser.ts'
import type { OpenMoralAccountDTO, OpenPhysicalAccountDTO } from '../schemas/account.schema.ts'
import type { TransactionalRecordDTO } from '../schemas/transactional.schema.ts'
import { appConfig } from '../config/config.instance.ts'

export const KuspitAccountService = {

  /**
   * Private Helper: Resolves geographic IDs based on ZIP code and neighborhood name.
   */
  async _resolveAddressIds(zipCode: string, legacySuburbName: string) {
    // 1. We call getCatalog specifying the expected response type
    const addressData = await adapter.getCatalog<AddressCatalogResponse>({
      name: 'direcciones',
      cp: zipCode,
    })

    if (!addressData || !addressData.colonia || addressData.colonia.length === 0) {
      throw new AppError(400, `The ZIP code ${zipCode} did not return any valid neighborhoods in Kuspit.`)
    }

    // 2. Normalization function (Removes accents, trims, upper)
    // E.g.: “San José ” -> “SAN JOSE”
    const normalize = (str: string) =>
      str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim() : ''

    const targetSuburb = normalize(legacySuburbName)

    // 3. Search for exact match
    let match = addressData.colonia.find(c => normalize(c.descripcion) === targetSuburb)

    // 4. Fallback
    if (!match) {
      match = addressData.colonia[0]

      logger.warn(`No match found for suburb '${legacySuburbName}' in CP ${zipCode}. Available: ${addressData.colonia.map(c => c.descripcion).join(', ')}. Selected first: '${match?.descripcion}'`)
    }

    // 5. If there is still no match, throw error
    if (!match) {
      throw new AppError(400, `No neighborhoods found for ZIP code ${zipCode}.`)
    }

    return {
      idPais: Number(addressData.pais.id),
      idEstado: Number(addressData.estado.id),
      idDelegacion: Number(addressData.municipio.id),
      idColonia: Number(match.id),
    }
  },

  /**
   * Open an Individual account using SECURE data from Commerce Service.
   * @param identity User context (idCommerce)
   * @param frontendPayload Additional data sent by the frontend (e.g., beneficiaries)
   * @param userToken Original Bearer token to query the service
   */
  async openPhysicalAccount(
    identity: number,
    frontendPayload: OpenPhysicalAccountDTO,
    userToken: string,
  ) {
    // 1. Get the information from the trusted Commerce Service
    const details = await fetchCommerceDetails(identity, userToken)

    // 2. Business Validations
    if (details.commerce.commerceType.id !== 1) {
      // ID 1 is for Physical Persons
      throw new AppError(400, 'The commerce is not registered as an individual.')
    }

    // We obtain the Legal Representative (the owner of the physical account).
    const repLegal = details.commerce.legalRepresentative[0]
    if (!repLegal) {
      throw new AppError(409, 'There is no legal representative assigned in the commercial register.')
    }

    // Validate critical data
    if (!repLegal.RFC || !repLegal.CURP) {
      throw new AppError(409, 'The user does not have an RFC or CURP configured in their profile.')
    }

    // 3. Obtain Kuspit Connection (Create Shell Account if it does not exist)
    const connection = await KuspitAuthService.ensureKuspitConnection({ idCommerce: identity, email: details.email })

    // 4. DATA MAPPING (Legacy -> Kuspit Payload)
    // We prioritize legacy data. We use frontendPayload only if something is missing or if it is editable data (address).

    const empresa = process.env['KUSPIT_ID_EMPRESA'] || '' // Default to null if the value is not set

    const addressSource = details.address

    const geoIds = await this._resolveAddressIds(
      addressSource.zipCode,
      addressSource.suburb,
    )

    const finalPayload: PhysicalAccountParams = {
      // -- IDENTITY (Immutable) --
      nombre: repLegal.name,
      apellidoPaterno: repLegal.lastName,
      apellidoMaterno: repLegal.motherLastName,
      rfc: repLegal.RFC,
      curp: repLegal.CURP,

      fechaNacimiento: repLegal.birthday?.split('T')[0] || '',

      sexo: repLegal.gender === 'F' ? 'M' : 'H',

      // -- ADDRESS --
      calle: addressSource.street,
      noExt: addressSource.exteriorNumber,
      noInt: addressSource.interiorNumber || '',
      cp: addressSource.zipCode,

      idPaisDom: geoIds.idPais,
      idEstadoDom: geoIds.idEstado,
      idDelegacion: geoIds.idDelegacion,
      idColonia: geoIds.idColonia,

      idPaisNacimiento: geoIds.idPais,
      idEstadoNacimiento: geoIds.idEstado,

      // -- CONTACT --
      telCelular: details.phone,

      // -- TECHNICAL/FISCAL DATA --
      empresa: empresa,
      idExterno: connection.kuspitAccountId.toString(),
      longitud: details.longitude || '0',
      latitud: details.latitude || '0',
      idRegimenFiscal: frontendPayload.idRegimenFiscal,
      cpFiscal: addressSource.zipCode,
    }

    if (!finalPayload.curp || !finalPayload.rfc) {
      throw new AppError(400, 'Critical data (RFC/CURP) not found in the user profile.')
    }

    // 5. SEND TO KUSPIT
    const kuspitResponse = await adapter.openPhysicalAccount({ ...finalPayload, token: connection.accessToken })

    // 6. LOCAL UPDATE (Placeholders cleaning)
    const fullName = `${repLegal.name} ${repLegal.lastName} ${repLegal.motherLastName || ''}`.trim()

    return await prisma.$transaction(async (tx) => {
      // A. Update Account
      const updatedAccount = await tx.account.update({
        where: { id: connection.kuspitAccountId },
        data: {
          bankAccountOwner: fullName, // CHECAR CON MARIO
          commerceName: fullName,
          bankAccount: kuspitResponse.clabeKuspit,
        },
      })

      await tx.accountSetting.updateMany({
        where: { idAccount: connection.kuspitAccountId },
        data: {
          kuspitContractId: Number(kuspitResponse.idContrato),
        },
      })

      // B. UPDATE OR CREATE CLABE (IMPORTANT FOR SPEI)
      // We search for the CLABE -> Cuenta link
      const existingLink = await tx.stpAccountClabe.findFirst({
        where: { idAccount: connection.kuspitAccountId },
        select: { idClabe: true },
      })

      if (existingLink) {
        await tx.clabe.update({
          where: { id: existingLink.idClabe },
          data: {
            clabe: kuspitResponse.clabeKuspit,
            ownerName: fullName,
            ownerRfcCurp: finalPayload.rfc || finalPayload.curp || '',
          },
        })
      }
      else {
        const newClabe = await tx.clabe.create({
          data: {
            clabe: kuspitResponse.clabeKuspit,
            idInstitution: 69,
            idClabeType: 3,
            ownerName: fullName,
            ownerRfcCurp: finalPayload.rfc || finalPayload.curp || '',
          },
        })
        await tx.stpAccountClabe.create({
          data: { idAccount: connection.kuspitAccountId, idClabe: newClabe.id },
        })
      }

      logger.info({
        accountId: connection.kuspitAccountId,
        type: 'FISICA',
      }, '✅ Kuspit Physical Account opened successfully.')

      return {
        account: updatedAccount,
        contractStatus: 'CREATED',
        details: {
          clabe: kuspitResponse.clabeKuspit,
          contrato: kuspitResponse.idContrato,
          registro: kuspitResponse.registro,
        },
      }
    })
  },

  /**
   * Open a MORAL Person (Company) account.
   * @param identity User context (idCommerce)
   * @param frontendPayload Additional data sent by the frontend (e.g., beneficiaries)
   * @param userToken Original Bearer token to query the service
   */
  async openMoralAccount(
    identity: number,
    frontendPayload: OpenMoralAccountDTO,
    userToken: string,
  ) {
    // 1. Get the information from the trusted Commerce Service
    const details = await fetchCommerceDetails(identity, userToken)

    // 2. Business Validations
    if (details.commerce.commerceType.id === 1) {
      // ID 1 is for Physical Persons
      throw new AppError(400, 'The commerce is registered as an individual.')
    }

    // We obtain the Legal Representative (the owner of the physical account).
    const repLegal = details.commerce.legalRepresentative[0]
    if (!repLegal || !repLegal.RFC || !repLegal.CURP) {
      throw new AppError(409, 'There is not enough data of the legal representative assigned (RFC/CURP).')
    }

    // Validate critical data
    if (!details.rfc || !details.socialReason) {
      throw new AppError(409, 'Commerce tax information (RFC/Company name) is missing.')
    }

    // 3. Obtain Kuspit Connection (Create Shell Account if it does not exist)
    const connection = await KuspitAuthService.ensureKuspitConnection({ idCommerce: identity, email: details.email })

    // 4. DATA MAPPING (Legacy -> Kuspit Payload)
    // We prioritize legacy data. We use frontendPayload only if something is missing or if it is editable data (address).

    const empresa = process.env['KUSPIT_ID_EMPRESA'] || '' // Default to null if the value is not set

    const addressSource = details.address

    const geoIds = await this._resolveAddressIds(
      addressSource.zipCode,
      addressSource.suburb,
    )

    const phoneData = splitMexicanPhoneNumber(details.phone)

    const finalPayload: MoralAccountParams = {
      // -- COMPANY IDENTITY (Immutable) --
      razonSocial: details.socialReason,
      rfc: details.rfc,
      fechaConstitucion: (
        frontendPayload.fechaConstitucion
        || details.registrationDate?.split('T')[0]
        || new Date().toISOString().split('T')[0]
      ) as string,

      // -- ADDRESS --
      calle: addressSource.street,
      noExt: addressSource.exteriorNumber,
      noInt: addressSource.interiorNumber || '',
      cp: addressSource.zipCode,

      idPais: geoIds.idPais,
      idEstado: geoIds.idEstado,
      idDelegacion: geoIds.idDelegacion,
      idColonia: geoIds.idColonia,

      // -- LEGAL REPRESENTATIVE --
      nombreR: repLegal.name,
      apPaternoR: repLegal.lastName,
      apMaternoR: repLegal.motherLastName,
      rfcR: repLegal.RFC,
      curpR: repLegal.CURP,
      noEscrituraPoderR: repLegal.oficialDocumentNumber,
      fechaProtocolizacionPoderO: (frontendPayload.fechaProtocolizacionPoderO || new Date().toISOString().split('T')[0]) as string,
      emailR: details.email,

      // -- NOTARY DATA --
      noFiel: details.electronicSignatureSerialNumber,
      idActividad: (frontendPayload.idActividad) as number,
      idGiro: (frontendPayload.idGiro) as number,
      numEscrituraConstitucion: details.actNumber || '',
      fechaProtocolizacion: (frontendPayload.fechaProtocolizacion || new Date().toISOString().split('T')[0]) as string,

      // -- BANK DATA --
      clabe: (frontendPayload.clabe) as string,
      idBanco: (frontendPayload.idBanco) as number,

      // -- OTHER TECHNICAL/FISCAL DATA --
      empresa: empresa,
      idExterno: connection.kuspitAccountId.toString(),
      claveLada: phoneData.lada,
      telefono: phoneData.numero,
      extension: frontendPayload.extension,
      longitud: details.longitude || '0',
      latitud: details.latitude || '0',
      idRegimenFiscal: frontendPayload.idRegimenFiscal,
      cpFiscal: addressSource.zipCode,
    }

    // 5. SEND TO KUSPIT
    const kuspitResponse = await adapter.openMoralAccount({ ...finalPayload, token: connection.accessToken })

    // 6. LOCAL UPDATE (Placeholders cleaning)

    return await prisma.$transaction(async (tx) => {
      // A. Update Account
      const updatedAccount = await tx.account.update({
        where: { id: connection.kuspitAccountId },
        data: {
          bankAccountOwner: details.socialReason, // CHECAR CON MARIO
          commerceName: details.socialReason,
          bankAccount: kuspitResponse.clabeKuspit,
        },
      })

      await tx.accountSetting.updateMany({
        where: { idAccount: connection.kuspitAccountId },
        data: {
          kuspitContractId: Number(kuspitResponse.idContrato),
        },
      })

      // B. UPDATE OR CREATE CLABE (IMPORTANT FOR SPEI)
      // We search for the CLABE -> Cuenta link
      const existingLink = await tx.stpAccountClabe.findFirst({
        where: { idAccount: connection.kuspitAccountId },
        select: { idClabe: true },
      })

      if (existingLink) {
        await tx.clabe.update({
          where: { id: existingLink.idClabe },
          data: {
            clabe: kuspitResponse.clabeKuspit,
            ownerName: details.socialReason,
            ownerRfcCurp: details.rfc || '',
          },
        })
      }
      else {
        const newClabe = await tx.clabe.create({
          data: {
            clabe: kuspitResponse.clabeKuspit,
            idInstitution: 69,
            idClabeType: 3,
            ownerName: details.socialReason,
            ownerRfcCurp: details.rfc || '',
          },
        })
        await tx.stpAccountClabe.create({
          data: { idAccount: connection.kuspitAccountId, idClabe: newClabe.id },
        })
      }

      logger.info({
        accountId: connection.kuspitAccountId,
        type: 'MORAL',
      }, '✅ Kuspit Moral Account opened successfully.')

      return {
        account: updatedAccount,
        contractStatus: 'CREATED',
        details: {
          clabe: kuspitResponse.clabeKuspit,
          contrato: kuspitResponse.idContrato,
          registro: kuspitResponse.registro,
        },
      }
    })
  },

  /**
   * Check and synchronize the contract status.
   * @param localAccountId - Account ID in the database (Account.id)
   */
  async checkAccountStatus(localAccountId: number) {
    // 1. Search for the account and token in the database
    const session = await KuspitAuthService.getValidSession(localAccountId)

    const account = await prisma.account.findUnique({
      where: { id: localAccountId },
      include: { accountSetting: true },
    })

    if (!account) throw new AppError(404, 'Account not found.')

    // 2. Preliminary Validations
    // We assume the contract is in the ‘contractId’ column
    const contractId = account.accountSetting?.[0]?.kuspitContractId

    if (!contractId) {
      // If there is no saved contract, it means that the opening process failed earlier.
      throw new AppError(400, 'This account does not have an assigned contract number yet.')
    }

    // Obtain Kuspit Connection
    const token = session.accessToken

    // 3. Call to the adapter
    const statusData = await adapter.getAccountOpeningStatus(contractId, token)

    // 4. Sync Logic (Update DB)
    // If Kuspit says ‘A’ (Authorized) and we had another status, we update.
    // let newLocalStatus = account.contractStatus

    // if (statusData.estatus === 'A' && account.contractStatus !== 'ACTIVE') {
    //   await prisma.account.update({
    //     where: { id: localAccountId },
    //     data: {
    //       contractStatus: 'ACTIVE', // Update to ACTIVE
    //     },
    //   })
    //   newLocalStatus = 'ACTIVE'
    //   logger.info({ localAccountId }, '🎉 Account authorized by Kuspit. Local status updated.')
    // }
    // else if (statusData.estatus === 'P') {
    //   logger.info({ localAccountId }, '⏳ Account still pending authorization in Kuspit.')
    // }

    // 5. Return to Frontend
    return {
      accountId: localAccountId,
      contractId: statusData.contrato,
      kuspitStatus: statusData.estatus, // 'P' or 'A'
      // localStatus: newLocalStatus,
      message: statusData.estatus === 'A' ? 'Cuenta Autorizada' : 'Cuenta Pendiente',
    }
  },

  async transactionalRecord(localAccountId: number, data: TransactionalRecordDTO) {
    const session = await KuspitAuthService.getValidSession(localAccountId)
    const account = await prisma.accountSetting.findFirst({
      where: { idAccount: localAccountId },
      select: { kuspitContractId: true },
    })
    if (!account?.kuspitContractId) {
      throw new AppError(400, 'The account does not have an active contract linked to it.')
    }
    const idEmpresa = appConfig.get<string>('kuspit.idEmpresa') || ''

    const payload = {
      ...data,
      idEmpresa: Number(idEmpresa),
      contrato: account.kuspitContractId,
      token: session.accessToken,
    }

    const rawData = await adapter.transactionalRecord(payload)

    return rawData
  },
}
