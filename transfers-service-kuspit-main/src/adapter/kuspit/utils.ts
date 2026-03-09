import { logger } from '../../shared/logger.ts'
import { AppError } from '../../shared/error-handler.ts'
import config from 'config'

export interface RequestOptions {
  method: 'GET' | 'POST'
  endpoint: string
  params?: URLSearchParams | FormData
  token?: string
  responseType?: 'json' | 'text' // Default: "json"
}

/**
 * Makes a request to the Kuspit API or similar endpoints.
 * @template T - The expected response type.
 * @param {RequestOptions} options - Request configuration.
 * @returns {Promise<T>} The parsed response data.
 * @throws {AppError} On request failure.
 */
export async function makeRequest<T>(options: RequestOptions): Promise<T> {
  const { method, endpoint, params, token, responseType = 'json' } = options
  let url

  try {
    const baseUrl = process.env['KUSPIT_API_URL'] || config.get('kuspit.url')
    url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    let body: BodyInit | null | undefined = undefined
    const headers: HeadersInit = {}

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (method === 'GET') {
      if (params instanceof URLSearchParams) {
        url += `?${params.toString()}`
      }
      else if (params instanceof FormData) {
        throw new AppError(
          400,
          'FormData does not support GET; use POST for uploads.',
        )
      }
    }
    else if (method === 'POST') {
      if (params instanceof URLSearchParams) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        body = params.toString()
      }
      else if (params instanceof FormData) {
        // No set Content-Type; is automatically done
        body = params
      }
    }

    logger.info(`Calling API: ${method} ${url}`)

    const fetchOptions: RequestInit = {
      method,
      headers,
      // Conditionally include body only if defined (avoids body: undefined)
      ...(body !== undefined ? { body } : {}),
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      logger.warn(
        `API call failed. Status: ${response.status}, Error: ${errorText}`,
      )
      throw new AppError(
        response.status,
        `API call failed: ${errorText || 'Unknown error'}`,
      )
    }

    let data: T
    if (responseType === 'json') {
      data = await response.json()
    }
    else {
      data = (await response.text()) as T
    }

    logger.info(`API call successful for ${endpoint}`)
    return data
  }
  catch (error) {
    logger.error({ error }, `Internal error in makeRequest for ${endpoint}`)
    throw new AppError(500, `Internal error in API call ${url} ${endpoint}`)
  }
}
