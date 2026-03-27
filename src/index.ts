import { appConfig } from './config/config.instance.ts'

// Load the configuration (Top-Level Await)
logger.info('⏳ Initializing configuration...')
await appConfig.load()
logger.info(`✅ Configuration loaded [Env: ${appConfig.get<string>('node.env')}]`)

import app from './app.ts'
import { start } from './shared/server.ts'
import { prisma } from './shared/prisma.ts'
import { logger } from './shared/logger.ts'

/**
 * Main entry point to initialize the application.
 * Verifies database connectivity and starts the server.
 */
async function main() {
  try {
    // In Prisma, we force a connection by executing a simple low-level query.
    await prisma.$queryRaw`SELECT 1`
    logger.info('✅ Database connected successfully via Prisma')

    const port = appConfig.get<number>('server.port') ?? 3000
    start(app, port as number)
  }
  catch (error) {
    // We catch initialization errors
    logger.error({ error }, `❌ Unable to connect to the database: ${error}`)
    process.exit(1)
  }
}

main()

/**
 * Global error handling for unexpected promise rejections.
 */
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Rejection')
  process.exit(1)
})

/**
 * Graceful shutdown to close database connections when the process ends.
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing Prisma connection')
  await prisma.$disconnect()
  process.exit(0)
})
