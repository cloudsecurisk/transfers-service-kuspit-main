import config from 'config' // Custom config con envs parsed
import app from './app.ts' // Express setup
import { start } from './shared/server.ts' // Start listener
// import db from './core/models.ts' // Sequelize index
import { logger } from './shared/logger.ts' // Pino logger

/**
 * Main entry point to initialize the application.
 * Connects to the database and starts the server.
 */
async function main() {
  try {
    // await db.sequelize.authenticate()
    logger.info('✅ Database connected successfully')

    const port = config.get('server.port') || process.env['SERVER_PORT']
    start(app, port as number)
  }
  catch (error) {
    logger.error({ error }, '❌ Unable to connect to the database or start server')
    process.exit(1)
  }
}

main()

// Opcional: Manejo global de errores
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Rejection')
  process.exit(1)
})
