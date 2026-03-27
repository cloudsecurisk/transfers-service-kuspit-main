import type { Request, Response, NextFunction } from 'express'
import { KuspitDocumentService } from '../services/document.service.ts'

export const DocumentController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const { idAccount } = req.params

      // Multer puts the file in req.file and the text fields in req.body.
      // Note: req.body may come as [Object: null prototype] by Multer.
      // Zod will handle it well.

      const result = await KuspitDocumentService.uploadDocument(
        Number(idAccount),
        req.body, // Validated by Zod
        req.file as Express.Multer.File,
      )

      res.status(200).json({ success: true, payload: result })
    }
    catch (error) { next(error) }
  },
}
