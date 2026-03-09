// Custom error class for better handling
export class AppError extends Error {
  statusCode: number

  constructor(
    statusCode: number,
    message: string,
  ) {
    super(message)
    this.statusCode = statusCode
  }
}

/**
 * Type guard to check if an unknown value is an Error.
 * @param error - The unknown error value.
 * @returns {boolean} True if it's an Error.
 */
export function isError(error: unknown): error is Error {
  return (
    error instanceof Error
    || (typeof error === 'object'
      && error !== null
      && 'message' in error
      && typeof error.message === 'string')
  )
}
