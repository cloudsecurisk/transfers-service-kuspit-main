import z from 'zod/v4'

export const registerProviderSchema = z.object({
  accion: z.enum(['A', 'B', 'C'], { error: 'Action (A, B, C) is mandatory.' }),

  // If it is a cancellation or change, we need the beneficiary's local ID to find their actual provider ID.
  idBeneficiarioLocal: z.number().optional(),

  nombreProveedor: z.string().min(3),
  rfc: z.string().length(13, 'The RFC must have 13 characters (individual) or 12 (legal entity).').or(z.string().length(12)),

  idBanco: z.number({ error: 'The Bank ID is required' }),

  // 40=CLABE, 03=Tarjeta, 10=Celular
  tipoCuenta: z.number(),

  cuenta: z.string().min(10).max(18),
}).refine((data) => {
  // Cross validation: Length vs Type
  // Assuming: 40=CLABE (18), 03=Tarjeta (16), 10=Celular (10)
  if (data.cuenta.length === 18) return true // CLABE
  if (data.cuenta.length === 16) return true // Tarjeta
  if (data.cuenta.length === 10) return true // Celular
  return false
}, {
  message: 'The account length is invalid (10, 16 or 18 digits)',
  path: ['cuenta'],
})

export const makeTransferSchema = z.object({
  monto: z.coerce.number().positive().min(1.00),
  conceptoPago: z.string().max(40, { error: 'Concept too long' }).optional().default('Transferencia'),
  referenciaNumerica: z.string()
    .min(3, 'Reference too short (Min 3 characters)')
    .max(30, 'Reference too long (Max 40 characters)')
    .regex(/^[a-zA-Z0-9 ]+$/, 'Only letters and numbers are allowed in the reference'),

  // Geolocalization required
  latitud: z.string({ error: 'Geolocalization required' }),
  longitud: z.string({ error: 'Geolocalization required' }),

  // Provider data
  nombreBeneficiario: z.string().min(3).trim(),
  cuentaBeneficiario: z.string().min(10).max(18),
  rfcCurpBeneficiario: z.string().optional().default('ND'),
  institucionContraparte: z.coerce.number(),
  tipoCuentaBeneficiario: z.coerce.number().optional().default(40),

  saveAccount: z.boolean().default(false),
  donation: z.number({ error: 'Donation amount invalid' })
    .min(0, { error: 'Donation cannot be negative' })
    .optional()
    .default(0),
})

export const getStatusSchema = z.object({
  transactionId: z.string({
    error: issue => issue.input === undefined ? 'Transaction ID required' : 'Invalid ID format',
  }).transform(val => Number(val)),
})

export const getMovementsSchema = z.object({
  // Validate format YYYY-MM-DD with simple Regex
  fechaInicial: z.string({ error: 'Start date required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Format must be YYYY-MM-DD' }),

  fechaFinal: z.string({ error: 'End date required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Format must be YYYY-MM-DD' }),

  // d=Depósito, r=Retiro, t=Transferencia
  tipoMovimiento: z.enum(['d', 'r', 't'], {
    error: 'Invalid movement type. Allowed: \'d\', \'r\', \'t\'',
  }).optional(),
})
  .refine((data) => {
  // Validation logic: End cannot be before Start
    return new Date(data.fechaFinal) >= new Date(data.fechaInicial)
  }, {
    message: 'End date cannot be before start date',
    path: ['fechaFinal'],
  })

export const makeWithdrawalSchema = z.object({
  monto: z.number({
    error: issue => issue.input === undefined ? 'Amount is required' : 'Amount must be a number',
  })
    .positive({ error: 'Amount must be positive' })
    .min(1.00, { error: 'Minimum withdrawal is 1.00' }),

  concepto: z.string().optional().default('Retiro de fondos'),

  // Geolocalization required
  latitud: z.string({ error: 'Latitude is required' }),
  longitud: z.string({ error: 'Longitude is required' }),
})

export const updateBankInfoSchema = z.object({
  idBanco: z.string({ error: 'Bank ID is required' })
    .transform(val => Number(val)),

  clabe: z.string()
    .length(18, { error: 'CLABE must be exactly 18 digits' })
    .regex(/^\d+$/, { error: 'CLABE must be numeric' }),

})

export type UpdateBankInfoDTO = z.infer<typeof updateBankInfoSchema>
export type MakeWithdrawalDTO = z.infer<typeof makeWithdrawalSchema>
export type GetMovementsDTO = z.infer<typeof getMovementsSchema>
export type MakeTransferDTO = z.infer<typeof makeTransferSchema>
export type RegisterProviderDTO = z.infer<typeof registerProviderSchema>
