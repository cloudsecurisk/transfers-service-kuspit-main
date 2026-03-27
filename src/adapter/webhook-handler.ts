import type { Request, Response } from 'express'
import crypto from 'crypto'
import { logger } from '../shared/logger.ts'
import type { KuspitWebhookPayload } from '../types/index.ts'
import { KuspitWebhookService } from '../services/webhook.service.ts'

/**
 * Main handler for Kuspit Webhooks.
 * Acts as the Primary Adapter in the Hexagonal Architecture.
 * Assumes that the 'validateKuspitSignature' middleware has already validated the security.
 */
export const kuspitWebhookHandler = (req: Request, res: Response): void => {
  // 1. Generate Confirmation Folio (Kuspit requirement)
  const folioConfirmacion = crypto.randomUUID()

  // 2. IMMEDIATE RESPONSE (ACK)
  // Respond with 200 OK immediately. We don't wait for body.database or slow logs.
  // Rule: Response must be sent within 30 seconds.
  res.status(200).json({ folioConfirmacion })

  // 3. ASYNC PROCESSING ("Fire and forget")
  // We use setImmediate to run this in the next tick of the event loop
  // without blocking the HTTP response.
  setImmediate(() => {
    // Here we pass the already parsed body (JSON)
    handleWebhookEvent(req.body, folioConfirmacion)
  })
}

/**
 * Routing logic for the event (Logging and future business logic).
 * Uses Discriminated Unions to ensure Type Safety inside each case.
 */
const handleWebhookEvent = (body: KuspitWebhookPayload, folio: string) => {
  logger.info(body)

  const { codigoEvento, data, identificadorNotificacion } = body

  // Base context for all logs for this transaction
  const logContext = {
    webhookId: identificadorNotificacion,
    folioInterno: folio,
    evento: codigoEvento,
  }

  logger.info(logContext, '📨 Webhook processed successfully (Async)')

  try {
    switch (codigoEvento) {
      // ---------------------------------------------------------
      // MONEY MOVEMENTS (DEPOSIT)
      // ---------------------------------------------------------
      case '01': // Deposit
        KuspitWebhookService.handleDeposit(data, logContext)
          .catch(err => logger.error({ err, ...logContext, data }, 'Error in handleDeposit'))
        break

      case '02': // Rejected Deposit (UDIS Limit)
        KuspitWebhookService.handleDepositRejection(data, logContext)
          .catch(err => logger.error({ err, ...logContext, data }, 'Error in handleDepositRejection'))
        break

      // ---------------------------------------------------------
      // DOCUMENTS Y RECORD
      // ---------------------------------------------------------
      case '03': // Documents Validated
        logger.info({
          ...logContext,
          data,
          tipo: 'DOCS_VALIDADOS',
          contrato: body.data.contrato,
          docs: body.data.documentos.map(d => d.documento),
        }, '📄 Documents validated correctly')
        break

      case '04': // Documents Rejected
        logger.warn({
          ...logContext,
          data,
          tipo: 'DOCS_RECHAZADOS',
          contrato: body.data.contrato,
          detalles: body.data.documentos,
        }, '⚠️ Documents rejected by Kuspit')
        break

      case '05': // Complete File (Expediente Completo)
        logger.info({
          ...logContext,
          data,
          tipo: 'EXPEDIENTE_COMPLETO',
          contrato: body.data.contrato,
        }, '📂 Customer file completed')
        break

      // ---------------------------------------------------------
      // MONEY MOVEMENTS (OUT)
      // ---------------------------------------------------------
      case '06': // Successful Transfer (Withdrawal)
        KuspitWebhookService.handleSpeiSuccess(data, logContext)
          .catch(err => logger.error({ err, ...logContext, data }, 'Error in handleSpeiSuccess'))
        break

      case '07': // Failed Transfer
        KuspitWebhookService.handleSpeiFailure(data, logContext)
          .catch(err => logger.error({ err, ...logContext, data }, 'Error in handleSpeiFailure'))
        break

      // ---------------------------------------------------------
      // CONTRACTS
      // ---------------------------------------------------------
      case '08': // Contract / CLABE
        KuspitWebhookService.handleContractAuthorization(data, logContext)
          .catch(err => logger.error({ err, ...logContext, data }, 'Error in handleContractAuthorization'))
        break

      // ---------------------------------------------------------
      // RETURNS
      // ---------------------------------------------------------
      case '09': // SPEI Return (Money returns) - Documentation Standard
        KuspitWebhookService.handleSpeiReturn(data, logContext)
          .catch(err => logger.error({ err, ...logContext, data }, 'Error in handleSpeiReturn'))
        break

      case '10': // Internal Return
        KuspitWebhookService.handleInternalReturn(data, logContext)
          .catch(err => logger.error({ err, ...logContext, data }, 'Error in handleInternalReturn'))
        break

      // ---------------------------------------------------------
      // DEFAULT (FALLBACK)
      // ---------------------------------------------------------
      default:
        logger.info({
          ...logContext,
          raw_data: data,
        }, `ℹ️ Unknown event received: ${codigoEvento}` as string)
        break
    }
  }
  catch (err) {
    // If the logging or future logic fails, it does not affect the 200 OK response that was already sent
    logger.error({ err, ...logContext }, '🔥 Error proccessing async logic for the webhook')
  }
}
