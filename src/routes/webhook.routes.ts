import { Router } from 'express'
import { validateKuspitSignature } from '../shared/webhook-validator.ts'
import { kuspitWebhookHandler } from '../adapter/webhook-handler.ts'

const router = Router()

// POST /kuspit/webhook
router.post(
  '/events',
  validateKuspitSignature, // 1. Validate security
  kuspitWebhookHandler, // 2. Answer and logging
)

export default router
