import { z } from 'zod'

export const completeRecordSchema = z.object({
  contrato: z.string().optional(),

  // Catalog from Kuspit (ex. 1=INE, 2=Comprobante, etc)
  tipo: z.string({ error: 'Document Type ID is required' })
    .transform(val => Number(val)),

  idTipoIdentificacion: z.string({ error: 'Identification Document Type ID is required' })
    .transform(val => Number(val)),

  // Extension deducted from file but it can also come from the Front
  extension: z.string().optional(),
})

export type CompleteRecordDTO = z.infer<typeof completeRecordSchema>
