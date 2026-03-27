import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../shared/error-handler.ts'
import { ZodError, ZodType } from 'zod/v4'
import type { ParsedQs } from 'qs'

/**
 * Middleware that validates the body against a Zod schema.
 */
export const validateBody = (schema: ZodType<unknown, unknown>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.body) {
        throw new AppError(400, 'The request body is missing.')
      }

      // parse() throws an error if it does not comply
      schema.parse(req.body)
      next()
    }
    catch (error) {
      if (error instanceof ZodError) {
        // We format the errors so that the front end knows which field failed.
        // E.g.: “idRegimenFiscal: Required, email: Invalid email”
        const errorMessage = error.issues
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(', ')

        // We send a Bad Request (400)
        next(new AppError(400, `Validation error: ${errorMessage}`))
      }
      else {
        next(error)
      }
    }
  }

/**
 * Validate and transform the URL parameters (req.params).
 */
export const validateParams = (schema: ZodType<unknown, unknown>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      // parse() throws an error if it does not comply
      req.params = schema.parse(req.params) as Request['params']

      next()
    }
    catch (error) {
      if (error instanceof ZodError) {
        // We format the errors so that the front end knows which field failed.
        // E.g.: “idRegimenFiscal: Required, email: Invalid email”
        const errorMessages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')

        // Send the error
        next(new AppError(400, `Invalid URL parameters: ${errorMessages}`))
      }
      else {
        next(error)
      }
    }
  }

/**
 * Validate and transform the Query parameters.
 */
export const validateQuery = (schema: ZodType<unknown, unknown>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Parse req.query
      req.query = schema.parse(req.query) as ParsedQs
      next()
    }
    catch (error) {
      if (error instanceof ZodError) {
        const msgs = error.issues.map(e => e.message).join(', ')
        next(new AppError(400, `Invalid filters: ${msgs}`))
      }
      else { next(error) }
    }
  }
