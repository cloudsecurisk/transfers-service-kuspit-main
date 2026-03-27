import type { Response, NextFunction } from 'express'
import crypto from 'crypto'
import type { RequestWithRawBody } from '../types/index.ts'
import { logger } from './logger.ts'
import { appConfig } from '../config/config.instance.ts'

const KUSPIT_SECRET = appConfig.get<string>('kuspit.secretKey') ?? ''

export const validateKuspitSignature = (req: RequestWithRawBody, res: Response, next: NextFunction): void => {
  const signatureHeader = req.header('Kuspit-signature')

  // 1. Validate that the header exists
  if (!signatureHeader) {
    logger.warn({ headers: req.headers }, '⛔ Trying to process webhook without signature')
    res.status(401).json({ error: 'Unauthorized: Missing Kuspit-signature header' })
    return
  }

  try {
    // 2. Parse the header (Format: T=yyyy-MM-dd HH:mm:ss,Sig=...)
    // Split by comma and then by equal sign
    const parts = signatureHeader.split(',').reduce((acc, curr) => {
      const separatorIndex = curr.indexOf('=')

      if (separatorIndex !== -1) {
        const key = curr.substring(0, separatorIndex).trim()
        const value = curr.substring(separatorIndex + 1).trim()
        acc[key] = value
      }
      return acc
    }, {} as Record<string, string>)

    const timestampStr = parts['T']
    const receivedSig = parts['Sig']

    if (!timestampStr || !receivedSig) {
      res.status(400).json({ error: 'Bad Request: Malformed Kuspit-signature header' })
      return
    }

    // 3. Time validation (Security: maximum 2 minutes of age)
    // Convert to ISO compatible replacing space by T
    const mexicoOffset = '-06:00'
    const isoDateStr = `${timestampStr.replace(' ', 'T')}${mexicoOffset}`

    const requestTime = new Date(isoDateStr).getTime()
    const now = new Date().getTime()
    const twoMinutes = 2 * 60 * 1000

    // Verify if the date is valid
    if (isNaN(requestTime)) {
      res.status(400).json({ error: 'Bad Request: Invalid Date Format' })
      return
    }

    // Validate range (allows 2 mins in the past and a margin of 1 min in the future due to clock skew)
    if (Math.abs(now - requestTime) > twoMinutes) {
      logger.warn(`⛔ Webhook rejected: Timestamp out of range. Diff: ${now - requestTime}ms`)
      res.status(403).json({ error: 'Forbidden: Request timestamp out of range' })
      return
    }

    // 4. Reconstruct the string to sign
    // RULE: JSON Body + "." + T
    if (!req.rawBody) {
      logger.error('Critical error: rawBody not captured. Check the route configuration.')
      res.status(500).json({ error: 'Internal Server Error' })
      return
    }

    // Use the Buffer directly converted to string UTF-8
    const payloadToSign = `${req.rawBody.toString('utf8')}.${timestampStr}`

    // 5. Calculate HMAC SHA256
    const calculatedSig = crypto
      .createHmac('sha256', KUSPIT_SECRET)
      .update(payloadToSign)
      .digest('base64')

    // 6. Compare signatures (Timing Safe Equal prevents time attacks)
    const sigBufferA = Buffer.from(calculatedSig)
    const sigBufferB = Buffer.from(receivedSig)

    if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
      logger.warn({
        received: receivedSig,
        calculated: calculatedSig,
        payload: payloadToSign,
      }, '❌ Invalid signature received')
      res.status(403).json({ error: 'Forbidden: Invalid Signature' })
      return
    }

    // If everything is correct, pass to the controller
    next()
  }
  catch (error) {
    logger.error(error, 'Error processing webhook signature')
    res.status(500).json({ error: 'Internal Server Error processing signature' })
    return
  }
}
