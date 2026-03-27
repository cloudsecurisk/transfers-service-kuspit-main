// --- 1. DOCUMENTS POOL ---
const DOC_DEFINITIONS: Record<number, string> = {
  // 3000 UDIS (Service 1)
  1: 'Comprobante domiciliario',
  2: 'Estado de cuenta',
  3: 'Identificación frente',
  4: 'Identificación reverso',
  5: 'CURP',
  6: 'RFC',

  // Fiscal Information (Service 2)
  7: 'Constancia de situación fiscal',

  // Exclusive Moral Entities (Service 3)
  8: 'Acta Constitutiva',
  9: 'Folio Mercantil del acta constitutiva',
  10: 'Registro Público de la Propiedad y del Comercio',
  11: 'Cédula de identificación fiscal RFC Empresa',
  12: 'Número de serie de la FIEL',
  15: 'Identificación oficial R.L.',
  16: 'Poderes del representante legal',
  17: 'Cédula de identificación fiscal RFC Representante Legal',
  18: 'CURP Representante legal',
  19: 'CURP - Propietario Real',
  20: 'Última acta de asamblea',
  21: 'Estructura Corporativa (organigrama)',
  22: 'RFC - Propietario real',
  23: 'Carta poder Persona autorizada',
}

// --- 2. ID SUB-CATALOG ---
export const ID_TYPES_LIST = [
  { id: 1, label: 'INE / IFE' },
  { id: 2, label: 'Pasaporte' },
  { id: 3, label: 'Cédula Profesional' },
]

// --- 3. RELATIONAL STRUCTURE (Service -> Documents) ---
export const KUSPIT_CATALOG_STRUCTURE = [
  {
    id: 1,
    label: 'Completar expediente 3000 UDIS',
    allowedDocuments: [
      { id: 1, label: DOC_DEFINITIONS[1] },
      { id: 2, label: DOC_DEFINITIONS[2] },
      { id: 3, label: DOC_DEFINITIONS[3] },
      { id: 4, label: DOC_DEFINITIONS[4] },
      { id: 5, label: DOC_DEFINITIONS[5] },
    ],
  },
  {
    id: 2,
    label: 'Información fiscal',
    allowedDocuments: [
      { id: 7, label: DOC_DEFINITIONS[7] },
    ],
  },
  {
    id: 3,
    label: 'CARGA DE DOCUMENTOS PERSONAS MORALES',
    allowedDocuments: [
      { id: 8, label: DOC_DEFINITIONS[8] },
      { id: 9, label: DOC_DEFINITIONS[9] },
      { id: 10, label: DOC_DEFINITIONS[10] },
      { id: 11, label: DOC_DEFINITIONS[11] },
      { id: 12, label: DOC_DEFINITIONS[12] },
      { id: 13, label: DOC_DEFINITIONS[13] },
      { id: 14, label: DOC_DEFINITIONS[14] },
      { id: 15, label: DOC_DEFINITIONS[15] },
      { id: 16, label: DOC_DEFINITIONS[16] },
      { id: 17, label: DOC_DEFINITIONS[17] },
      { id: 18, label: DOC_DEFINITIONS[18] },
      { id: 19, label: DOC_DEFINITIONS[19] },
      { id: 20, label: DOC_DEFINITIONS[20] },
      { id: 21, label: DOC_DEFINITIONS[21] },
      { id: 22, label: DOC_DEFINITIONS[22] },
      { id: 23, label: DOC_DEFINITIONS[23] },
      { id: 24, label: DOC_DEFINITIONS[24] },
    ],
  },
]

export const KUSPIT_ACTION_TYPE = {
  ALTA: 1,
  CAMBIO: 2,
} as const
