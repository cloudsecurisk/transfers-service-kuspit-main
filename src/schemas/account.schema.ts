import z from 'zod/v4'

// Outline for opening a physical account
export const openPhysicalAccountSchema = z.object({
  // Rules:
  // 1. IdRegimenFiscal should be a string of numbers (ej "612"). Optional.
  idRegimenFiscal: z
    .number()
    .int()
    .min(100, 'Must be at least 3 digits')
    .max(999, 'Must be max 3 digits')
    .optional(),

})

export const openMoralAccountSchema = z.object({
  // Rules:
  // 1. IdRegimenFiscal should be a string of numbers (ej "612"). Optional.
  idRegimenFiscal: z
    .number()
    .int()
    .min(100, 'Must be at least 3 digits')
    .max(999, 'Must be max 3 digits')
    .optional(),

  // 2. Optional dates in YYYY-MM-DD format
  fechaConstitucion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
  fechaProtocolizacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),
  fechaProtocolizacionPoderO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD').optional(),

  // 3. Numeric fields
  idActividad: z.number({ error: 'The Activity is required' }),
  idGiro: z.number({ error: 'The Business Line is required' }),

  // 4. Bank details
  clabe: z.string().length(18, 'The CLABE must have 18 digits').optional(),
  idBanco: z.number({ error: 'The Bank is required' }),

  // 5. Extension (optional)
  extension: z.number().optional(),
})

export type OpenPhysicalAccountDTO = z.infer<typeof openPhysicalAccountSchema>
export type OpenMoralAccountDTO = z.infer<typeof openMoralAccountSchema>
