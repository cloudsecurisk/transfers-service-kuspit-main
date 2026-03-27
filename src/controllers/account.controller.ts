import type { Request, Response, NextFunction } from 'express'
import { KuspitAccountService } from '../services/account.service.ts'
import { AppError } from '../shared/error-handler.ts'
import type { LegacyAuthCommerce } from '../types/index.ts' // Tus tipos definidos

export const AccountController = {

  /**
   * Endpoint for opening an account for individuals.
   */
  async openPhysical(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Get Raw Token (Bearer ...)
      // Required for the Service to query the Legacy API
      const authHeader = req.headers.authorization
      if (!authHeader) {
        throw new AppError(401, 'No authorization header provided.')
      }

      // 2. Extract User Context (Injected by requirePermission)
      const commerce = res.locals['commerce'] as LegacyAuthCommerce

      // Defensive Check validation
      if (!commerce) {
        throw new AppError(403, 'Commerce context not found in session.')
      }

      // 3. Execute Business Logic
      // We pass the commerce ID, the frontend body, and the original token
      const result = await KuspitAccountService.openPhysicalAccount(
        commerce.id,
        req.body,
        authHeader,
      )

      // 4. Successful Response
      res.status(201).json({
        success: true,
        message: 'Kuspit Physical account opened successfully.',
        payload: {
          accountId: result.account.id,
          contract: result.details.contrato,
          clabe: result.details.clabe,
          status: result.contractStatus,
        },
      })
    }
    catch (error) {
      // Global Error Handling
      next(error)
    }
  },

  /**
   * Endpoint for opening a Moral Entity account (Companies).
   */
  async openMoral(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Get Raw Token (Bearer ...)
      // Required for the Service to query the Legacy API
      const authHeader = req.headers.authorization
      if (!authHeader) throw new AppError(401, 'No authorization header provided.')

      // 2. Extract User Context (Injected by requirePermission)
      const commerce = res.locals['commerce'] as LegacyAuthCommerce
      // Defensive Check validation
      if (!commerce) throw new AppError(403, 'Commerce context not found in session.')

      // 3. Execute Business Logic
      // We pass the commerce ID, the frontend body, and the original token
      const result = await KuspitAccountService.openMoralAccount(
        commerce.id,
        req.body,
        authHeader,
      )

      // 4. Successful Response
      res.status(201).json({
        success: true,
        message: 'Kuspit Moral account opened successfully.',
        payload: {
          accountId: result.account.id,
          contract: result.details.contrato,
          clabe: result.details.clabe,
        },
      })
    }
    catch (error) {
      // Global Error Handling
      next(error)
    }
  },

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // The account ID is included in the URL parameters: GET /accounts/:id/status
      const { idAccount } = req.params

      // Basic validation
      if (!idAccount || isNaN(Number(idAccount))) {
        throw new AppError(400, 'Invalid account ID')
      }

      // Validate that the user (Token) is the owner of that account (Security)
      // res.locals.user.id vs the account... (Optional but recommended)
      const result = await KuspitAccountService.checkAccountStatus(Number(idAccount))

      res.status(200).json({
        success: true,
        payload: result,
      })
    }
    catch (error) {
      next(error)
    }
  },

  async transactionalRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { idAccount } = req.params

      if (!idAccount || isNaN(Number(idAccount))) {
        throw new AppError(400, 'Invalid account ID')
      }

      const result = await KuspitAccountService.transactionalRecord(Number(idAccount), req.body)

      res.status(200).json({
        success: true,
        payload: result,
      })
    }
    catch (error) {
      next(error)
    }
  },
}
