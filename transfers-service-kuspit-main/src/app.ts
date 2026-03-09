import cors from 'cors'
import config from 'config'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import routes from './routes/test-routes.ts'
import { AppError } from './shared/error-handler.ts'
import { logger } from './shared/logger.ts'

const env = process.env['NODE_ENV'] || 'development' // Default to 'development' for consistency
const app: express.Express = express()

app.use(helmet()) // Security headers
app.use(cors(config.get('cors'))) // CORS from config
app.use(express.json({ limit: '50mb' })) // Parser JSON with limit

// Mount routes (use baseUrl from config)
app.use(`/${config.get('server.baseUrl')}`, routes)

// Mount ping endpoint
app.get('/ping', (_req: Request, res: Response) =>
  res.status(200).send(Date.now().toString()),
)

// Error handler
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (env !== 'production') {
    logger.error('[ERROR]')
    logger.error(error)
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
    })
  }
  else {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 404 handler (simplified)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    returnCode: 404,
    error: `The ${req.path} endpoint doesn't exist`,
  })
})

export default app
