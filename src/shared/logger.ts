import pino, { type LoggerOptions } from 'pino'

const isProduction = process.env['NODE_ENV'] === 'production'
const isCloudRun = !!process.env['K_SERVICE']

const usePrettyLogs = !isProduction && !isCloudRun

// 1. Base logger options
const pinoOptions: LoggerOptions = {
  // Log level
  level: process.env['LOG_LEVEL'] || (isProduction ? 'info' : 'debug'),

  // Google Cloud Logging uses 'message'
  messageKey: 'message',

  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },

  // Formatter for Google Cloud (Severity)
  formatters: {
    level(label) {
      return { severity: label.toUpperCase() }
    },
  },

  base: null,

  // Timestamp ISO standard
  timestamp: pino.stdTimeFunctions.isoTime,
}

// 2. Add transport only if not production and not cloud run
if (usePrettyLogs) {
  pinoOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  }
}

export const logger = pino(pinoOptions)
