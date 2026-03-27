import type { Request, Response, NextFunction } from 'express'
import { checkRemotePermission } from '../adapter/external/auth-service.ts'
import { AppError } from '../shared/error-handler.ts'
import { logger } from '../shared/logger.ts'

interface PermissionOptions {
  route: string
  module?: string // Default: 'transfer'
  passUser?: boolean // Default: true
  roles?: number[] // Roles permisson
}

/**
 * Factory function to create the middleware for permission checking.
 */
export const requirePermission = (options: PermissionOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization

      if (!authHeader) {
        throw new AppError(401, 'Auth token not provided.')
      }

      // 1. Validate permission (Adapter)
      const authData = await checkRemotePermission(
        authHeader,
        options.route,
        req.method,
      )

      // 2. Extra Validations (Roles specified like permitsWToken)
      if (options.roles && options.roles.length > 0) {
        // Asumming the role comes from user.idRole or commerce.roleTransfer
        const userRole = authData.payload.user.crole.id

        if (!options.roles.includes(userRole)) {
          logger.warn({ user: authData.payload.user.id, role: userRole }, 'Not authorized role')
          throw new AppError(403, 'Not authorized role to this action.')
        }
      }

      // 3. Inject user in the context (res.locals)
      if (options.passUser !== false) {
        res.locals['user'] = authData.payload.user
        res.locals['commerce'] = authData.payload.commerce
      }

      next()
    }
    catch (error) {
      next(error) // Global Error Handler
    }
  }
}
