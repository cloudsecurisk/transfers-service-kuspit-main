import { Router } from 'express'
import type { Request, Response } from 'express'
import { KuspitBankAdapter } from '../adapter/kuspit-bank-adapter.ts'
import { logger } from '../shared/logger.ts' // Pino
import { AppError } from '../shared/error-handler.ts' // Error custom

const env = process.env['NODE_ENV'] || 'development'
const router: Router = Router()
const adapter = new KuspitBankAdapter()

// Dev-only;
if (env !== 'development') {
  logger.warn('Test routes disabled in non-dev env')
}
else {
  /**
   * @swagger
   * /test/linkClient:
   *   post:
   *     summary: Test linkClient method
   *     tags: [Test]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/KuspitLinkParams'
   *     responses:
   *       200:
   *         description: Link response
   *       400:
   *         description: Invalid params
   */
  router.post('/linkClient', async (req: Request, res: Response) => {
    try {
      const params = req.body
      const result = await adapter.linkClient(params)
      res.json(result)
    }
    catch (error) {
      logger.error({ error }, 'Error in linkClient test')
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message })
      }
      else {
        res.status(500).json({ error: 'Internal error' })
      }
    }
  })

  /**
   * @swagger
   * /test/requestToken:
   *   post:
   *     summary: Test requestToken method
   *     tags: [Test]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TokenRequestParams'
   *     responses:
   *       200:
   *         description: Token response
   */
  router.post('/requestToken', async (req: Request, res: Response) => {
    try {
      const params = req.body
      const result = await adapter.requestToken(params)
      res.json(result)
    }
    catch (error) {
      logger.error({ error }, 'Error in requestToken test')
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message })
      }
      else {
        res.status(500).json({ error: 'Internal error' })
      }
    }
  })

  /**
   * @swagger
   * /test/refreshToken:
   *   post:
   *     summary: Test refreshToken method
   *     tags: [Test]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/TokenRefreshParams'
   *     responses:
   *       200:
   *         description: Refresh response
   */
  router.post('/refreshToken', async (req: Request, res: Response) => {
    try {
      const params = req.body
      const result = await adapter.refreshToken(params)
      res.json(result)
    }
    catch (error) {
      logger.error({ error }, 'Error in refreshToken test')
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message })
      }
      else {
        res.status(500).json({ error: 'Internal error' })
      }
    }
  })
}

export default router
