import type { Express } from 'express'
import { logger } from './logger.ts'

/**
 * start
 * Allow us to start the server after everything is ready
 * and loaded
 * @param {Express} application - The Express app instance
 * @param {number} [port=3000] - The port to listen on (default: 3000)
 */
export function start(application: Express, port: number = 3000) {
  application.listen(port, () => {
    logger.info(`🚀 Server is running at port: ${port}`)
  })
}
