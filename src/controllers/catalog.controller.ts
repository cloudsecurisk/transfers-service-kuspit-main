import type { Request, Response, NextFunction } from 'express'
import { KuspitCatalogService } from '../services/kuspit.catalog.service.ts'
import { activitiesSchema } from '../schemas/catalog.schema.ts'

export const KuspitCatalogController = {

  async getRegimes(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.query['type'] === 'moral' ? 'moral' : 'fisica'

      const payload = await KuspitCatalogService.getFiscalRegimes(type)

      res.status(200).json({
        success: true,
        payload,
      })
    }
    catch (error) {
      next(error)
    }
  },

  async getBanks(_req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await KuspitCatalogService.getBanks()

      res.status(200).json({ success: true, payload })
    }
    catch (error) { next(error) }
  },

  async getGiros(_req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await KuspitCatalogService.getGiros()

      res.status(200).json({ success: true, payload })
    }
    catch (error) { next(error) }
  },

  async getActivities(req: Request, res: Response, next: NextFunction) {
    try {
      // From the query param ?idGiro=5
      const query = activitiesSchema.parse(req.query)

      const payload = await KuspitCatalogService.getActivities(query.idGiro ? String(query.idGiro) : undefined)

      res.status(200).json({ success: true, payload })
    }
    catch (error) { next(error) }
  },

  async getIncomes(_req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await KuspitCatalogService.getIncomes()
      res.status(200).json({ success: true, payload })
    }
    catch (error) { next(error) }
  },

  async getProvenances(_req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await KuspitCatalogService.getProvenances()
      res.status(200).json({ success: true, payload })
    }
    catch (error) { next(error) }
  },

  async getSources(_req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await KuspitCatalogService.getSources()
      res.status(200).json({ success: true, payload })
    }
    catch (error) { next(error) }
  },

  async getOperations(_req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await KuspitCatalogService.getOperations()
      res.status(200).json({ success: true, payload })
    }
    catch (error) { next(error) }
  },

  async getInvestments(_req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await KuspitCatalogService.getInvestments()
      res.status(200).json({ success: true, payload })
    }
    catch (error) { next(error) }
  },

  async getMarkets(_req: Request, res: Response, next: NextFunction) {
    try {
      const payload = await KuspitCatalogService.getMarkets()
      res.status(200).json({ success: true, payload })
    }
    catch (error) { next(error) }
  },
}
