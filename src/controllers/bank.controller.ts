import type { Request, Response, NextFunction } from 'express'
import { KuspitBankService } from '../services/bank.service.ts'
import { AppError } from '../shared/error-handler.ts'
import { ID_TYPES_LIST, KUSPIT_CATALOG_STRUCTURE } from '../shared/kuspit-catalog.ts'
import type { GetMovementsDTO, UpdateBankInfoDTO } from '../schemas/bank.schema.ts'

export const BankController = {

  async getPosition(req: Request, res: Response, next: NextFunction) {
    try {
      const { idAccount } = req.params

      if (!idAccount || isNaN(Number(idAccount))) {
        throw new AppError(400, 'Invalid account ID')
      }

      const portfolio = await KuspitBankService.getPortfolioPosition(Number(idAccount))

      res.status(200).json({
        success: true,
        payload: portfolio,
      })
    }
    catch (error) {
      next(error)
    }
  },

  async getLiquidAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const { idAccount } = req.params

      if (!idAccount || isNaN(Number(idAccount))) {
        throw new AppError(400, 'Invalid account ID')
      }

      const liquidAssets = await KuspitBankService.getLiquidAssets(Number(idAccount))

      res.status(200).json({
        success: true,
        payload: liquidAssets,
      })
    }
    catch (error) {
      next(error)
    }
  },

  async registerProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const { idAccount } = req.params

      if (!idAccount || isNaN(Number(idAccount))) {
        throw new AppError(400, 'Invalid account ID')
      }

      const result = await KuspitBankService.registerProvider(
        Number(idAccount),
        req.body, // The body must already be validated by Zod.
      )

      res.status(200).json({
        success: true,
        message: `Operation '${req.body.accion}' successful.`,
        payload: result,
      })
    }
    catch (error) {
      next(error)
    }
  },

  async makeTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { idAccount } = req.params

      if (!idAccount || isNaN(Number(idAccount))) {
        throw new AppError(400, 'Invalid Account ID')
      }

      const result = await KuspitBankService.makeTransfer(
        Number(idAccount),
        req.body,
      )

      res.status(200).json({
        success: true,
        message: 'Transfer successful',
        payload: result,
      })
    }
    catch (error) {
      next(error)
    }
  },

  /**
   * Check the status in real time and reconcile if necessary.
   */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params

      const result = await KuspitBankService.getTransferStatus(Number(transactionId))

      res.status(200).json({
        success: true,
        payload: result,
      })
    }
    catch (error) {
      next(error)
    }
  },

  async getDocumentCatalogs(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        payload: {
          services: KUSPIT_CATALOG_STRUCTURE,
          identifications: ID_TYPES_LIST,
        },
      })
    }
    catch (error) {
      next(error)
    }
  },

  async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const { idAccount } = req.params

      const filters = req.query as unknown as GetMovementsDTO

      const result = await KuspitBankService.getMovements(Number(idAccount), filters)

      res.status(200).json({
        success: true,
        count: result.length,
        payload: result,
      })
    }
    catch (error) { next(error) }
  },

  async makeWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const { idAccount } = req.params
      const result = await KuspitBankService.makeWithdrawal(Number(idAccount), req.body)

      res.status(200).json({ success: true, payload: result })
    }
    catch (error) { next(error) }
  },

  async updateBankInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { idAccount } = req.params

      if (!req.file) {
        throw new AppError(400, 'File "caratulaCuentaClaBe" is missing')
      }

      const payload = req.body as UpdateBankInfoDTO

      // 3. Llamar al Servicio
      const result = await KuspitBankService.updateBankInfo(
        Number(idAccount),
        payload,
        req.file,
      )

      res.status(200).json({
        success: true,
        message: result.mensaje, // "Tus datos están siendo revisados"
        payload: {
          status: result.estatus,
          date: result.fechaRegistro,
        },
      })
    }
    catch (error) {
      next(error)
    }
  },
}
