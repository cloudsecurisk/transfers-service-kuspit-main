import z from 'zod/v4'

export const activitiesSchema = z.object({
  idGiro: z.coerce.number().int().min(1).max(20).optional(),
})
