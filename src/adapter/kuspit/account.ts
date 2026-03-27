import { logger } from '../../shared/logger.ts'
import { makeRequest } from './utils.ts'

export interface KuspitErrorDetail {
  codigo: string
  mensaje: string
}

export interface PhysicalAccountParams {
  empresa: string
  idExterno: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  telCelular: string
  fechaNacimiento: string // yyyyMMdd
  curp: string
  rfc?: string | undefined
  idPaisDom: number // Default: 1 (Mexico)
  idEstadoDom: number
  idDelegacion: number
  idColonia: number
  cp: string
  calle: string
  noExt: string
  noInt?: string | undefined
  idPaisNacimiento: number // Default: 1 (Mexico)
  idEstadoNacimiento: number
  sexo: 'H' | 'M'
  longitud: string
  latitud: string
  idRegimenFiscal?: number | undefined
  cpFiscal?: string | undefined
}

export interface MoralAccountParams {
  empresa: string
  idExterno: string
  razonSocial: string
  rfc: string
  claveLada: number
  telefono: string
  extension?: number | undefined
  noFiel: string
  idActividad: number
  idGiro: number
  fechaConstitucion: string // yyyyMMdd
  numEscrituraConstitucion: string
  fechaProtocolizacion: string // yyyyMMdd
  nombreR: string // Representante legal
  apPaternoR: string
  apMaternoR: string
  rfcR: string
  curpR: string
  noEscrituraPoderR: string
  fechaProtocolizacionPoderO: string // yyyyMMdd
  emailR: string
  calle: string
  noExt: string
  noInt?: string | undefined
  idPais: number // Default: 1 (Mexico)
  idEstado: number
  idDelegacion: number
  idColonia: number
  cp: string
  idBanco: number
  clabe: string
  longitud: string
  latitud: string
  idRegimenFiscal?: number | undefined
  cpFiscal?: string
}

export interface AccountOpeningResponse {
  clabeKuspit: string
  idContrato: string
  registro: boolean
  error?: KuspitErrorDetail
}

export interface AccountOpeningStatusResponse {
  estatus: 'P' | 'A' // P=Pending, A=Accepted
  contrato: number
}

export interface RecordParams {
  idEmpresa: number
  contrato: number
  extension: 'pdf' | 'png' | 'jpeg'
  tipo: number
  archivo: File | Blob // Binary file
  idTipoIdentificacion: number
}

export interface RecordResponse {
  faultKsb: string
  json: string
  listaMapas: [{ [documentoCorrecto: string]: boolean }]
  message: string
}

export interface TransactionalRecordParams {
  idEmpresa: number
  contrato: number
  ocupacion: string
  idGiro: string
  idIngresoMensual: string
  idProcedencia: string
  idActividad: string
  idFuenteIngreso: string
  idOperaciones: string
  idInversion: string
  idMercados: string
  noFiel?: string | undefined
  isActEmpresarial: string
  latitud: string
  longitud: string
}

export interface TransactionalRecordResponse {
  faultKsb: string
  estatus: string
  message: string
}

/**
 * Opens a physical (individual) account in Kuspit.
 * @param {PhysicalAccountParams} params - Parameters for physical account opening.
 * @returns {Promise<AccountOpeningResponse>} The response with account details.
 */
export async function openPhysicalAccount(
  params: PhysicalAccountParams & { token: string },
): Promise<AccountOpeningResponse> {
  // Body as form-urlencoded
  const bodyParams = new URLSearchParams({
    empresa: params.empresa,
    idExterno: params.idExterno,
    nombre: params.nombre,
    apellidoPaterno: params.apellidoPaterno,
    apellidoMaterno: params.apellidoMaterno,
    telCelular: params.telCelular,
    fechaNacimiento: params.fechaNacimiento,
    curp: params.curp,
    rfc: params.rfc || '',
    idPaisDom: params.idPaisDom.toString(),
    idEstadoDom: params.idEstadoDom.toString(),
    idDelegacion: params.idDelegacion.toString(),
    idColonia: params.idColonia.toString(),
    cp: params.cp.toString(),
    calle: params.calle,
    noExt: params.noExt,
    noInt: params.noInt || '',
    idPaisNacimiento: params.idPaisNacimiento.toString(),
    idEstadoNacimiento: params.idEstadoNacimiento.toString(),
    sexo: params.sexo,
    longitud: params.longitud,
    latitud: params.latitud,
    idRegimenFiscal: params.idRegimenFiscal?.toString() || '',
    cpFiscal: params.cpFiscal || '',
  })

  return makeRequest<AccountOpeningResponse>({
    method: 'POST',
    endpoint: 'v3/contratos/fisicas',
    params: bodyParams,
    token: params.token,
  })
}

/**
 * Opens a moral (legal entity) account in Kuspit.
 * @param {MoralAccountParams} params - Parameters for moral account opening.
 * @returns {Promise<AccountOpeningResponse>} The response with account details.
 */
export async function openMoralAccount(
  params: MoralAccountParams & { token: string },
): Promise<AccountOpeningResponse> {
  // Body as form-urlencoded
  const bodyParams = new URLSearchParams({
    empresa: params.empresa,
    idExterno: params.idExterno,
    razonSocial: params.razonSocial,
    rfc: params.rfc,
    claveLada: params.claveLada.toString(),
    telefono: params.telefono,
    extension: params.extension?.toString() || '',
    noFiel: params.noFiel,
    idActividad: params.idActividad.toString(),
    idGiro: params.idGiro.toString(),
    fechaConstitucion: params.fechaConstitucion,
    numEscrituraConstitucion: params.numEscrituraConstitucion,
    fechaProtocolizacion: params.fechaProtocolizacion,
    nombreR: params.nombreR,
    apPaternoR: params.apPaternoR,
    apMaternoR: params.apMaternoR,
    rfcR: params.rfcR,
    curpR: params.curpR,
    noEscrituraPoderR: params.noEscrituraPoderR,
    fechaProtocolizacionPoderO: params.fechaProtocolizacionPoderO,
    emailR: params.emailR,
    calle: params.calle,
    noExt: params.noExt,
    noInt: params.noInt || '',
    idPais: params.idPais.toString(),
    idEstado: params.idEstado.toString(),
    idDelegacion: params.idDelegacion.toString(),
    idColonia: params.idColonia.toString(),
    cp: params.cp,
    idBanco: params.idBanco.toString(),
    clabe: params.clabe,
    longitud: params.longitud,
    latitud: params.latitud,
    idRegimenFiscal: params.idRegimenFiscal?.toString() || '',
    cpFiscal: params.cpFiscal || '',
  })

  return makeRequest<AccountOpeningResponse>({
    method: 'POST',
    endpoint: 'v3/contratos/morales',
    params: bodyParams,
    token: params.token,
  })
}

/**
 * Retrieves the status of an account opening request.
 * @param {number} contrato - The external ID used in the account opening request.
 * @param {string} token - The access token for authentication.
 * @returns {Promise<AccountOpeningStatusResponse>} The response with account details.
 */
export async function getAccountOpeningStatus(
  contrato: number,
  token: string,
): Promise<AccountOpeningStatusResponse> {
  const query = new URLSearchParams({
    contrato: contrato.toString(),
  })

  return makeRequest<AccountOpeningStatusResponse>({
    method: 'GET',
    endpoint: `v1/contratos/estatus`,
    params: query,
    token: token,
  })

  // if (!["P", "A"].includes(status)) {
  //   throw new AppError(
  //     500,
  //     `Invalid account opening status received: ${status}`,
  //   );
  // }
}

/**
 * Completes the account record to exceed the 3000 UDIS limit.
 * @param {RecordParams} params - Parameters for account completion.
 * @returns {Promise<RecordResponse>} Resolves when the process is complete.
 */
export async function completeRecord(
  params: RecordParams & { token: string },
): Promise<RecordResponse> {
  const formData = new FormData()
  formData.append('idEmpresa', params.idEmpresa.toString())
  formData.append('contrato', params.contrato.toString())
  formData.append('extension', params.extension)
  formData.append('tipo', params.tipo.toString())
  const fileWithProps = params.archivo as unknown as { name?: string }
  const finalFileName = fileWithProps.name || `documento_soporte.${params.extension}`
  logger.info(`Uploading file with name: ${finalFileName}`)
  logger.info(`File details - Size: ${params.archivo.size} bytes, Type: ${params.archivo.type}`)
  formData.append('archivo', params.archivo, finalFileName)
  formData.append('idTipoIdentificacion', params.idTipoIdentificacion.toString())

  return makeRequest<RecordResponse>({
    method: 'POST',
    endpoint: 'v1/contratos/documentos/subirDocumento',
    params: formData,
    token: params.token,
  })
}

/**
 * Submits a transactional record for an account to get.
 * @param {TransactionalRecordParams} params - Parameters for the transactional record.
 * @returns {Promise<TransactionalRecordResponse>} The response from the API.
 */
export async function transactionalRecord(
  params: TransactionalRecordParams & { token: string },
): Promise<TransactionalRecordResponse> {
  const formData = new FormData()
  formData.append('idEmpresa', params.idEmpresa.toString())
  formData.append('contrato', params.contrato.toString())
  formData.append('ocupacion', params.ocupacion)
  formData.append('idGiro', params.idGiro)
  formData.append('idIngresoMensual', params.idIngresoMensual)
  formData.append('idProcedencia', params.idProcedencia)
  formData.append('idActividad', params.idActividad)
  formData.append('idFuenteIngreso', params.idFuenteIngreso)
  formData.append('idOperaciones', params.idOperaciones)
  formData.append('idInversion', params.idInversion)
  formData.append('idMercados', params.idMercados)
  formData.append('noFiel', params.noFiel || '')
  formData.append('isActEmpresarial', params.isActEmpresarial)
  formData.append('latitud', params.latitud || '')
  formData.append('longitud', params.longitud || '')

  return makeRequest<TransactionalRecordResponse>({
    method: 'POST',
    endpoint: 'v1/contratos/informacionTransaccional',
    params: formData,
    token: params.token,
  })
}
