import { prisma } from '../shared/prisma.ts'
import { AppError } from '../shared/error-handler.ts'
import { KuspitAuthService } from './auth.service.ts'
import type { CompleteRecordDTO } from '../schemas/document.schema.ts'
import { adapter } from '../adapter/kuspit.adapter.ts'
import { appConfig } from '../config/config.instance.ts'

export const KuspitDocumentService = {

  async uploadDocument(
    localAccountId: number,
    data: CompleteRecordDTO,
    file: Express.Multer.File,
  ) {
    if (!file) throw new AppError(400, 'No file uploaded.')

    // 1. Get Session and Validate Contract
    const session = await KuspitAuthService.getValidSession(localAccountId)

    const account = await prisma.account.findUnique({
      where: { id: localAccountId },
      include: { accountSetting: true },
    })

    const settings = account?.accountSetting[0]
    if (!settings?.kuspitContractId) throw new AppError(400, 'Account has no contract.')

    // Security Validation
    if (data.contrato && data.contrato !== settings.kuspitContractId.toString()) {
      throw new AppError(403, 'Contract mismatch. You can only upload documents for your own contract.')
    }

    // 2. Determine Extension
    // If the frontend did not send it, we remove it from the original name (e.g., “photo.jpg” -> “jpg”)
    let fileExtension = data.extension
    if (!fileExtension) {
      const parts = file.originalname.split('.')
      fileExtension = parts.length > 1 ? parts.pop() : ''
    }
    // Cleaning
    fileExtension = fileExtension?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'pdf'

    if (fileExtension === 'jpg') fileExtension = 'jpeg'
    const allowedExtensions = ['pdf', 'png', 'jpeg']

    if (!allowedExtensions.includes(fileExtension)) {
      throw new AppError(400, `Invalid file type (${fileExtension}). Allowed formats: pdf, png, jpeg.`)
    }

    // 3. Call to Adapter
    const nativeFile = new File(
      [new Uint8Array(file.buffer)],
      file.originalname,
      { type: file.mimetype },
    )

    const payload = {
      idEmpresa: Number(appConfig.get<string>('kuspit.idEmpresa')),
      contrato: settings.kuspitContractId,
      tipo: data.tipo,
      idTipoIdentificacion: data.idTipoIdentificacion,
      extension: fileExtension as 'pdf' | 'png' | 'jpeg',
      archivo: nativeFile,
      filename: file.originalname,
    }

    const response = await adapter.completeRecord({ ...payload, token: session.accessToken })

    // 4. Analyze Business Response
    // Kuspit sometimes returns 200 OK but with an error message in 'listaMapas'
    const statusMap = response.listaMapas?.[0]

    const isSuccess = Boolean(statusMap?.['documentoCorrecto'])

    return {
      success: isSuccess,
      kuspitMessage: response.message,
      flags: statusMap,
      uploadedFile: file.originalname,
    }
  },
}
