import * as os from 'os'
import pino from 'pino'

const logger = process.env['NODE_ENV'] !== 'production'
  ? pino({
      level: 'debug',
      base: { pid: process.pid, hostname: os.hostname() },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      transport: { target: 'pino-pretty' }, // Pretty in dev
    })
  : pino({
      level: 'info',
      base: { pid: process.pid, hostname: os.hostname() },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
    })

export { logger }
