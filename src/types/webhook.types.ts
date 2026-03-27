/**
 * Kuspit Webhook Types Definition
 */

// ==========================================
// 1. Specific Data Interfaces
// ==========================================

/**
 * Event 01: Deposit Notification
 * Triggered when a new deposit is received in the beneficiary account.
 */
export interface DepositData {
  /** Name of the person making the deposit */
  nombreOrdenante: string
  /** Account number of the person making the deposit */
  cuentaOrdenante: string
  /** Source bank institution ID (e.g., 90653) */
  institucionOrdenante: number
  /** RFC of the person making the deposit */
  rfcOrdenante: string
  /** Beneficiary account number (Kuspit) */
  cuentaBeneficiaria: string
  /** Beneficiary institution ID (e.g., 853) */
  institucionBeneficiaria: string | number
  /** Concept of the deposit */
  concepto: string
  /** Deposit amount */
  monto: number
  /** Payment type ID (e.g., 1 for Third party, 36 for Incoming remittance) */
  idTipoPago: number | string
  /** Capture date (ISO 8601: yyyy-MM-ddTHH:mm:ss) */
  fechaCaptura: string
  /** Operation date (dd/mm/aaaa or yyyy-MM-dd) */
  fechaOperacion: string
  /** Tracking key (SPEI) */
  claveRastreo: string
  /** Numeric reference */
  referenciaNumerica: string | number
}

/**
 * Event 02: Rejected Deposit Notification (UDIS Limit)
 * Triggered when a deposit is rejected because the account exceeded 3000 UDIS.
 */
export interface RejectedDepositData {
  /** Contract number */
  contrato: number
  /** Amount returned */
  monto: number
  /** Reason ID for return (e.g., "21") */
  causaDevolucion: string | number
  /** Payment concept (usually "Devolución") */
  conceptoPago: string
  /** Tracking key */
  claveRastreo: string
  /** Time of return (HH:mm:ss) */
  horaDevolucion: string
  /** Date of return (yyyy-MM-dd) */
  fechaDevolucion: string
  /** Event description (Always "Devolución") */
  tipoEvento: string
}

/**
 * Sub-type for Document Array Items used in Events 03 & 04
 */
export interface DocumentItem {
  /** Name of the document (e.g., "CURP") */
  documento: string
  /** Document ID */
  idDocumento: number
  /** Rejection reason (Only present in Event 04) */
  motivoRechazo?: string
}

/**
 * Event 03 & 04: Document Validation/Rejection
 * Triggered when a document is validated or rejected.
 */
export interface DocumentUpdateData {
  /** Contract number */
  contrato: string | number
  /** Event description (e.g., "Documentos validados" or "Documentos rechazados") */
  tipoEvento: string
  /** List of processed documents */
  documentos: DocumentItem[]
}

/**
 * Event 05: Complete File Notification
 * Triggered when the client's file (expediente) is confirmed complete.
 */
export interface CompleteFileData {
  /** Contract number */
  contrato: string | number
  /** Event description (Always "Expediente Completo") */
  tipoEvento: string
}

/**
 * Event 06: Successful Transfer Notification (Withdrawal)
 * Triggered when a money transfer (withdrawal) is successful.
 */
export interface SuccessfulTransferData {
  /** Source bank institution ID */
  institucionOrdenante: string | number
  /** Tracking key of the transfer */
  claveRastreo: string
  /** Beneficiary account number */
  cuentaBeneficiaria: string
  /** RFC of the payer */
  rfcOrdenante: string
  /** Transfer amount */
  monto: number
  /** Capture date (yyyy-MM-dd HH:mm:ss) */
  fechaCaptura: string
  /** Name of the payer */
  nombreOrdenante: string
  /** Transfer concept */
  concepto: string
  /** Payer account number */
  cuentaOrdenante: string
  /** Numeric reference */
  referenciaNumerica: string | number
  /** Beneficiary institution ID */
  institucionBeneficiaria: string | number
  /** Operation date (yyyy-MM-dd HH:mm:ss) */
  fechaOperacion: string
  /** Transfer status ID (Always "1001" for success) */
  idEstatusTransferencia: string
}

/**
 * Event 07: Failed Transfer Notification
 * Triggered when an error occurs in the SPEI transfer process.
 */
export interface FailedTransferData {
  /** Tracking key */
  claveRastreo: string
  /** Return cause code */
  causaDevolucion: string | number
  /** Transfer status ID (e.g., "1002" for insufficient funds) */
  idEstatusTransferencia: string
  /** Error description */
  descripcionError: string
}

/**
 * Event 08: Authorized Contract Notification
 * Triggered when a contract status changes to "Authorized".
 */
export interface AuthorizedContractData {
  /** Assigned CLABE account */
  clabe: string
  /** Contract number */
  contrato: number
  /** Contract status ("Pendiente" / "Autorizado") */
  estatusContrato: string
  /** Authorization timestamp */
  fechaAutorizacion: string
  /** Name or Legal Name */
  nombre: string
  /** Person type ("Persona Moral" / "Persona fisica") */
  tipoPersona: string
}

/**
 * Event 09: SPEI Return Notification
 * Triggered when a destination bank returns the money (reversal).
 * Note: Documentation mentions code "02" in text but "9" in JSON example.
 * We map this to code "9" or "09" for consistency.
 */
export interface SpeiReturnData {
  /** Contract number */
  contrato: string | number
  /** Returned amount */
  montoDevolucion: number
  /** Cause ID (1-31) */
  causaDevolucion: number
  /** Payment concept */
  conceptoPago: string
  /** Original tracking key */
  claveRastreoOriginal: string
  /** Return tracking key */
  claveRastreoDevolucion: string
  /** Return time (HH:mm:ss) */
  horaDevolucion: string
  /** Operation date (yyyy-MM-dd) */
  fechaOperacion: string
}

/**
 * Event 10: Internal Return Notification
 * Triggered when an internal return is executed.
 */
export interface InternalReturnData {
  /** Contract number */
  contrato: number | string
  /** Returned amount */
  monto: number
  /** Cause code (01, 02, 21) */
  causaDevolucion: string
  /** Payment concept ("Devolución interna") */
  conceptoPago: string
  /** Original tracking key */
  claveRastreo: string
  /** Return tracking key */
  claveRastreoDevolucion: string
  /** Return time (HH:mm:ss) */
  horaDevolucion: string
  /** Capture date (yyyy-MM-dd) */
  fechaCaptura: string
  /** Event description ("Devolución Interna") */
  tipoEvento: string
}

// ==========================================
// 2. Discriminated Union
// ==========================================

/**
 * Main type representing any possible Webhook payload from Kuspit.
 * Uses `codigoEvento` as the discriminator key.
 */
export type KuspitWebhookPayload
  = | { codigoEvento: '01', identificadorNotificacion: string, data: DepositData }
    | { codigoEvento: '02', identificadorNotificacion: string, data: RejectedDepositData }
    | { codigoEvento: '03', identificadorNotificacion: string, data: DocumentUpdateData }
    | { codigoEvento: '04', identificadorNotificacion: string, data: DocumentUpdateData }
    | { codigoEvento: '05', identificadorNotificacion: string, data: CompleteFileData }
    | { codigoEvento: '06', identificadorNotificacion: string, data: SuccessfulTransferData }
    | { codigoEvento: '07', identificadorNotificacion: string, data: FailedTransferData }
    | { codigoEvento: '08', identificadorNotificacion: string, data: AuthorizedContractData }
    | { codigoEvento: '09', identificadorNotificacion: string, data: SpeiReturnData }
    | { codigoEvento: '10', identificadorNotificacion: string, data: InternalReturnData }
