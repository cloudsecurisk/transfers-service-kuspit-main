import type { Express } from 'express'
import { logger } from './logger.ts'

/**
 * Starts the Express server listener.
 * @param {Express} application - The Express app instance
 * @param {number} [port=3000] - The port to listen on
 */
export function start(application: Express, port: number = 3000) {
  application.listen(port, () => {
    logger.info(`🚀 Server is running at port: ${port}`)
  })
}
