import { appConfig } from '../../config/config.instance.ts'
import { AppError } from '../../shared/error-handler.ts'
import { logger } from '../../shared/logger.ts'
import type { GeneralInfoCommerce } from '../../types/index.ts'

// 0. We define the API wrapper response  (response.successData)
interface ApiResponse<T> {
  payload: T
  message?: string
}

export const fetchCommerceDetails = async (idCommerce: number, authToken: string): Promise<GeneralInfoCommerce> => {
  const serviceUrl = appConfig.get<string>('commerce.url')
  const endpoint = `/api/commerce/${idCommerce}`
  const url = `${serviceUrl}${endpoint}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
      },
    })

    // 1. HTTP Error Handling (4xx, 5xx)
    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError(404, 'The commerce does not exist in the central system..')
      }
      if (response.status === 401 || response.status === 403) {
        throw new AppError(403, 'You do not have permission to access the data for the commerce.')
      }

      const errorText = await response.text()
      logger.error({ status: response.status, body: errorText }, 'Error using CommerceService')
      throw new AppError(502, `Error in the commerce service: ${response.statusText}`)
    }

    // 2. Parse and validate response
    const rawData = await response.json() as unknown
    const apiResponse = rawData as ApiResponse<GeneralInfoCommerce>

    if (!apiResponse || !apiResponse.payload) {
      throw new AppError(502, 'The response from the commerce service is invalid.')
    }

    return apiResponse.payload
  }
  catch (error: unknown) {
    if (error instanceof AppError) throw error
    const msg = error instanceof Error ? error.message : 'Unknown Error'
    logger.error({ error: msg, idCommerce }, 'Network error fetching commerce')
    throw new AppError(502, 'Communication error with the identity service.')
  }
}
