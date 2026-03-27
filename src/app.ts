import cors from 'cors'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import { AppError } from './shared/error-handler.ts'
import { logger } from './shared/logger.ts'
import kuspitRoutes from './routes/kuspit.routes.ts'
import webhookRouter from './routes/webhook.routes.ts'
import { ZodError } from 'zod/v4'
import { appConfig } from './config/config.instance.ts'

const app: express.Express = express()

app.use(helmet())

const corsOptions = {
  origin: appConfig.get<string[] | string>('cors.origin'),
  methods: appConfig.get<string[]>('cors.methods'),
  allowedHeaders: appConfig.get<string[]>('cors.headers'),
  credentials: appConfig.get<boolean>('cors.credentials'),
}

app.use(cors(corsOptions))

app.use(express.json({
  verify: (req: Request, _res, buf) => {
    (req as Request & { rawBody?: Buffer }).rawBody = buf
  },
  limit: '500mb',
}))

// Routes
app.use('/webhook', webhookRouter)
app.use(`/${appConfig.get<string>('server.baseUrl')}`, kuspitRoutes)

// Health Endpoint
app.use('/ping', (_req: Request, res: Response) => {
  res.status(200).send(Date.now().toString())
})

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  // 1. Default (asumimos Error 500)
  let statusCode = 500
  let message = 'Internal server error'
  let errorDetails = undefined

  // 2. If it is a known error (AppError), we extract the data
  if (error instanceof Error) {
    message = error.message
  }

  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
  }

  if (error instanceof ZodError) {
    errorDetails = error.issues
  }

  // 3. Prepare the strucured log (JSON)
  const logContext = {
    // Info HTTP útil para agrupar en Cloud Logging
    httpRequest: {
      requestMethod: req.method,
      requestUrl: req.originalUrl,
      status: statusCode,
      remoteIp: req.ip,
      userAgent: req.get('user-agent'),
    },
    err: error,
  }

  // 4. Log
  if (statusCode >= 500) {
    // Server Error -> ERROR Level (Red)
    logger.error(logContext, `[${statusCode}] ${message}`)
  }
  else {
    // Client Error (400, 404, etc) -> WARN Level (Orange)
    logger.warn(logContext, `[${statusCode}] ${message}`)
  }

  // 5. Response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(errorDetails && { details: errorDetails }),
  })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    returnCode: 404,
    error: `The ${req.path} endpoint doesn't exist`,
  })
})

export default app
