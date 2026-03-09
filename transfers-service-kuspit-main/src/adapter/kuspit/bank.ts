import { makeRequest } from './utils.ts'

export interface ProviderRegistrationParams {
  contrato: number
  empresa: string
  nombreProveedor: string
  rfc: string
  idBanco: number
  tipoCuenta: number
  cuenta: string
  accion: 'A' | 'B' | 'C' // A=Alta, B=Baja, C=Consulta
  idProveedor?: number
}

export interface ProviderRegistrationResponse {
  idProveedor: number
  fechaRegistro: string
  estatus: string
}

export interface TransferParams {
  contrato: number
  empresa: string
  idProveedorTercero: number
  monto: number
  referencia: string
  concepto?: string // Max 40 chars. Only alphanumeric. Not special chars.
  claveRastreo?: string // Max 14 chars. Only alphanumeric. Not special chars.
  longitud: string
  latitud: string
}

export interface TransferResponse {
  claveRastreo: string // 16 chars, followed by the one sent in the request.
  estatus: string
  causaEstatus: string
}

export interface StatusParams {
  contrato: number
  empresa: string
  claveRastreo: string
  fechaOperacion: string // yyyyMMdd
  referencia?: string
}

export interface StatusResponse {
  claveRastreo: string
  institucionContraparte: string
  fechaOrden: string // yyyyMMdd
  estatus: string
  causaDevolucion: string
  claveRastreoDevolicion: string
  claveSpei: number
}

export interface MovementsParams {
  contrato: number
  empresa: string
  fechaInicial: string // yyyy-MM-dd
  fechaFinal: string // yyyy-MM-dd
  tipoMovimiento: 'd' | 'r' | 't' // d=Depositos, r=Retiros, t=Transferencias(Internas/Externas)
}

export interface MovementsResponse {
  movimientos: Array<{
    bancoReceptor: number
    claveRastreo: string
    concepto: string
    fechaLiquidacion: string // yyyy-MM-dd
    monto: number
    comision: number
    iva: number
    estatus: string
    fechaOrden: string
    bancoEmisor: number
    tipoMovimiento: string
    cuentaBeneficiaria: string
    cuentaOrdenante: string
  }>
}

export interface WithdrawalParams {
  contrato: number
  empresa: string
  monto: number
  concepto?: string
  longitud: string
  latitud: string
}

export interface WithdrawalResponse {
  claveRastreo: string
  estatus: string // REJ, RER, RNE, RNF
}

export interface UpdateBankInfoParams {
  idEmpresa: number
  contrato: number
  idBanco: number
  clabe: string
  idTipoAccion: number // 1=Update, 2=Delete
  caratulaCuentaClaBe: File | Blob // Binary file. PDF, PNG, JPEG.
}

export interface UpdateBankInfoResponse {
  mensaje: string
  fechaRegistro: string
  estatus: string
}

export interface Position {
  resumen: {
    gananciaPerdida: number
    rendimientoPortafolio: number
    costo: number
    posicion: number
  }
  efectivo: {
    efectivo: number
  }
  titulos: {
    costoTitulos: number
    serie: string
    variacionPrecio: number
    tipoValor: string
    emisora: string
    gananciaPerdida: number
    precio: number
    variacionPorcentaje: number
    gananciaPerdidaPrecio: number
    valorhoyEnTitulos: number
    costoUnitario: number
    titulos: number
    alzabaja: number
    gananciaPerdidaPorcentaje: number
  }
}

/**
 * Registers a provider in Kuspit.
 * @param {ProviderRegistrationParams} params - Parameters for provider registration.
 * @returns {Promise<ProviderRegistrationResponse>} The response with registration details.
 */
export async function registerProvider(
  params: ProviderRegistrationParams & { token: string },
): Promise<ProviderRegistrationResponse> {
  // Body as form-urlencoded
  const bodyParams = new URLSearchParams({
    contrato: params.contrato.toString(),
    empresa: params.empresa,
    nombreProveedor: params.nombreProveedor,
    rfc: params.rfc,
    idBanco: params.idBanco.toString(),
    tipoCuenta: params.tipoCuenta.toString(),
    cuenta: params.cuenta,
    accion: params.accion,
    idProveedor: params.idProveedor?.toString() || '',
  })

  return makeRequest<ProviderRegistrationResponse>({
    method: 'POST',
    endpoint: 'v2/banca/transferencias/proveedores',
    params: bodyParams,
    token: params.token,
  })
}

/**
 * Performs a transfer to a registered provider in Kuspit.
 * @param {TransferParams} params - Parameters for the transfer.
 * @returns {Promise<TransferResponse>} The response with transfer details.
 */
export async function makeTransfer(
  params: TransferParams & { token: string },
): Promise<TransferResponse> {
  // Body as form-urlencoded
  const bodyParams = new URLSearchParams({
    contrato: params.contrato.toString(),
    empresa: params.empresa,
    idProveedorTercero: params.idProveedorTercero.toString(),
    monto: params.monto.toString(),
    referencia: params.referencia,
    concepto: params.concepto || '',
    claveRastreo: params.claveRastreo || '',
    longitud: params.longitud,
    latitud: params.latitud,
  })

  return makeRequest<TransferResponse>({
    method: 'POST',
    endpoint: 'v3/banca/transferencias',
    params: bodyParams,
    token: params.token,
  })
}

/**
 * Queries the status of a SPEI transfer in Kuspit.
 * @param {StatusParams} params - Parameters for the status query.
 * @returns {Promise<StatusResponse>} The status of the transfer.
 */
export async function getTransferStatus(
  params: StatusParams & { token: string },
): Promise<StatusResponse> {
  // Body as form-urlencoded
  const queryParams = new URLSearchParams({
    contrato: params.contrato.toString(),
    empresa: params.empresa,
    claveRastreo: params.claveRastreo,
    fechaOperacion: params.fechaOperacion,
    referencia: params.referencia || '',
  })

  return makeRequest<StatusResponse>({
    method: 'GET',
    endpoint: 'v1/banca/transferencias/consultas/spei',
    params: queryParams,
    token: params.token,
  })
}

/**
 * Queries the movements of an account in Kuspit.
 * @param {MovementsParams} params - Parameters for the movements query.
 * @returns {Promise<MovementsResponse>} The account movements.
 */
export async function getAccountMovements(
  params: MovementsParams & { token: string },
): Promise<MovementsResponse> {
  // Body as form-urlencoded
  const queryParams = new URLSearchParams({
    contrato: params.contrato.toString(),
    empresa: params.empresa,
    fechaInicial: params.fechaInicial,
    fechaFinal: params.fechaFinal,
    tipoMovimiento: params.tipoMovimiento,
  })

  return makeRequest<MovementsResponse>({
    method: 'GET',
    endpoint: 'v2/banca/consultas/movimientos',
    params: queryParams,
    token: params.token,
  })
}

/**
 * Process a withdrawal from the account.
 * @param {WithdrawalParams} params - Parameters for the withdrawal.
 * @returns {Promise<WithdrawalResponse>} The response with withdrawal details.
 */
export async function makeWithdrawal(
  params: WithdrawalParams & { token: string },
): Promise<WithdrawalResponse> {
  // Body as form-urlencoded
  const bodyParams = new URLSearchParams({
    contrato: params.contrato.toString(),
    empresa: params.empresa,
    monto: params.monto.toString(),
    concepto: params.concepto || '',
    longitud: params.longitud,
    latitud: params.latitud,
  })

  return makeRequest<WithdrawalResponse>({
    method: 'POST',
    endpoint: 'v2/banca/retiros',
    params: bodyParams,
    token: params.token,
  })
}

/**
 * Updates the bank information of an account.
 * @param {UpdateBankInfoParams} params - Parameters for updating bank info.
 * @returns {Promise<UpdateBankInfoResponse>} The response with update details.
 */
export async function updateBankInfo(
  params: UpdateBankInfoParams & { token: string },
): Promise<UpdateBankInfoResponse> {
  const formData = new FormData()
  formData.append('idEmpresa', params.idEmpresa.toString())
  formData.append('contrato', params.contrato.toString())
  formData.append('idBanco', params.idBanco.toString())
  formData.append('clabe', params.clabe)
  formData.append('idTipoAccion', params.idTipoAccion.toString())
  formData.append('caratulaCuentaClaBe', params.caratulaCuentaClaBe)

  return makeRequest<UpdateBankInfoResponse>({
    method: 'POST',
    endpoint: '/v1/banca/actualiza/informacionBancaria',
    params: formData,
    token: params.token,
  })
}

/**
 * Gets the position of the account.
 * @param {number} contrato - The number of the contract linked to the account to get the position for.
 * @returns {Promise<Position>} The position of the account.
 */
export async function getPosition(contrato: number, token: string): Promise<Position> {
  return makeRequest<Position>({
    method: 'GET',
    endpoint: '/v1/trading/posicion/' + contrato,
    token: token,
  })
}
