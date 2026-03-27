import defaultConfig from '../../config/default.json' with { type: 'json' }
import { AppError } from '../shared/error-handler.ts'
import { logger } from '../shared/logger.ts'

// 1. Strict Type Definitions
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]

export interface JsonObject {
  [key: string]: JsonValue | undefined
}

// Interface to handle Node.js errors safely without 'any'
interface SystemError {
  code?: string
  message: string
}

export class ConfigurationManager {
  private config: JsonObject = {}

  constructor() {
    // Cast default config to JsonObject to satisfy the recursive interface
    this.config = { ...defaultConfig } as JsonObject
  }

  public async load(): Promise<void> {
    const env = process.env['NODE_ENV'] || 'development'

    if (env !== 'default') {
      try {
        // Native Dynamic Import
        const module = await import(`../../config/${env}.json`, {
          with: { type: 'json' },
        })

        // Deep merge environment config over default config
        this.config = this.deepMerge(this.config, module.default as JsonObject)
        logger.info(`✅ Configuration [${env}] loaded.`)
      }
      catch (unknownError) {
        // Safe error handling without 'any'
        const error = unknownError as SystemError

        // Silent fail for module not found (fallback to default), loud fail for syntax errors
        if (error.code !== 'ERR_MODULE_NOT_FOUND') {
          logger.error(error, `❌ Error parsing config [${env}].`)
        }
      }
    }

    // Inject overrides for keys that exist in JSON (to preserve Arrays)
    // AND keys that don't (Orphan variables)
    this.injectEnvOverrides(this.config)
  }

  /**
   * 🆕 SMART GETTER
   * 1. Looks in the internal JSON object structure.
   * 2. If missing, converts the key to ENV format (SNAKE_CASE) and looks in process.env.
   */
  public get<T extends JsonValue>(key: string): T | undefined {
    // A. Try to find it in the internal JSON structure
    const keys = key.split('.')
    let current: JsonValue | undefined = this.config
    let foundInJson = true

    for (const k of keys) {
      if (this.isObject(current) && current[k] !== undefined) {
        current = current[k]
      }
      else {
        foundInJson = false
        break
      }
    }

    if (foundInJson && current !== undefined) {
      return current as T
    }

    // B. Fallback: Look directly in process.env
    // Example: 'node.env' -> 'NODE_ENV' | 'kuspit.apiUrl' -> 'KUSPIT_API_URL'
    const envKey = this.toEnvKey(key)
    const envVal = process.env[envKey]

    if (envVal !== undefined) {
      return this.parseEnvValue(envVal) as T
    }

    return undefined
  }

  /**
   * Strict retrieval. Throws an Error if not found in JSON OR Environment.
   * Use this for critical variables (URLs, Secrets).
   */
  public getOrThrow<T extends JsonValue>(key: string): T {
    const value = this.get<T>(key)
    if (value === undefined || value === null) {
      throw new AppError(500, `🔥 Missing critical configuration: ${key}`)
    }
    return value
  }

  /**
   * Returns the entire configuration object.
   */
  public get all(): JsonObject {
    return this.config
  }

  // --- Private Helpers ---

  /**
   * Converts a dot-notation path to SNAKE_CASE environment key.
   * Examples:
   * - node.env -> NODE_ENV
   * - kuspit.apiUrl -> KUSPIT_API_URL
   */
  private toEnvKey(path: string): string {
    return path
      .replace(/\./g, '_') // Replace dots with underscores
      .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase -> snake_case
      .toUpperCase()
  }

  /**
   * Auto-casts string environment variables to primitives.
   * Handles "true"/"false" strings and numeric strings.
   */
  private parseEnvValue(val: string): JsonValue {
    if (val.toLowerCase() === 'true') return true
    if (val.toLowerCase() === 'false') return false

    // Check if it's a number (and not an empty string)
    if (!isNaN(Number(val)) && val.trim() !== '') {
      return Number(val)
    }

    // Note: Orphans are returned as strings because we lack the JSON definition
    // to confirm if they should be Arrays.
    return val
  }

  /**
   * Recursively merges two JsonObjects.
   */
  private deepMerge(target: JsonObject, source: JsonObject): JsonObject {
    const output = { ...target }

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        const sourceValue = source[key]
        const targetValue = target[key]

        if (sourceValue === undefined) return

        if (this.isObject(sourceValue)) {
          if (!(key in target)) {
            Object.assign(output, { [key]: sourceValue })
          }
          else if (this.isObject(targetValue)) {
            output[key] = this.deepMerge(targetValue, sourceValue)
          }
        }
        else {
          Object.assign(output, { [key]: sourceValue })
        }
      })
    }
    return output
  }

  /**
   * Type Guard to check if an item is a valid JsonObject.
   */
  private isObject(item: unknown): item is JsonObject {
    return (!!item && typeof item === 'object' && !Array.isArray(item))
  }

  /**
   * Recursively traverses the config object and overrides values if
   * a corresponding Environment Variable exists.
   */
  private injectEnvOverrides(obj: JsonObject, prefix = ''): void {
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue

      const value = obj[key]
      if (value === undefined) continue

      // Convert key to SNAKE_CASE for lookup
      const snakeKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()
      const envKey = prefix ? `${prefix}_${snakeKey}` : snakeKey

      if (this.isObject(value)) {
        this.injectEnvOverrides(value, envKey)
      }
      else {
        const envVal = process.env[envKey]

        if (envVal !== undefined) {
          if (Array.isArray(value)) {
            // Handle Wildcard or Comma-separated list
            if (envVal === '*') {
              obj[key] = '*'
            }
            else {
              obj[key] = envVal.split(',').map(i => i.trim())
            }
          }
          else {
            // Use smart parsing for primitives
            obj[key] = this.parseEnvValue(envVal)
          }
        }
      }
    }
  }
}
