import { z } from 'zod/v4'

export const transactionalRecordSchema = z.object({
  ocupacion: z.string(),
  idGiro: z.string(),
  idIngresoMensual: z.string(),
  idProcedencia: z.string(),
  idActividad: z.string(),
  idFuenteIngreso: z.string(),
  idOperaciones: z.string(),
  idInversion: z.string(),
  idMercados: z.string(),
  noFiel: z.string().optional(),
  isActEmpresarial: z.enum(['0', '1']),
  latitud: z.string(),
  longitud: z.string(),
})

export type TransactionalRecordDTO = z.infer<typeof transactionalRecordSchema>
