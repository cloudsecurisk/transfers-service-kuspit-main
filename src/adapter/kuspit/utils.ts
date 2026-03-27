import { appConfig } from '../../config/config.instance.ts'
import { AppError } from '../../shared/error-handler.ts'
import { logger } from '../../shared/logger.ts'
export interface AddressCatalogResponse {
  pais: CatalogResponse
  estado: CatalogResponse
  municipio: CatalogResponse
  colonia: CatalogResponse[]
}

export interface CatalogParams {
  name: string
  cp?: string
  idPais?: string
  idGiro?: string
  idServicio?: string
  idDocumento?: string
}

export interface CatalogResponse {
  id: number
  descripcion: string
}

export interface RequestOptions {
  method: 'GET' | 'POST'
  endpoint: string
  params?: URLSearchParams | FormData
  token?: string
  responseType?: 'json' | 'text' // Default: "json"
  responseEncoding?: 'utf-8' | 'iso-8859-1' | 'windows-1252'
}

/**
 * Gets a catalog from the Kuspit API.
 * @param {CatalogParams} params - Parameters for the catalog query.
 * @returns {Promise<CatalogResponse>} The catalog data.
 */
export function getCatalog<T = CatalogResponse>(params: CatalogParams): Promise<T> {
  const name = params.name
  const queryParams = new URLSearchParams()

  let endpoint = `v1/catalogos/${name}`

  if (params.cp && name == 'direcciones') {
    endpoint = 'v2/catalogos/direcciones'
    queryParams.append('cp', params.cp)
  }

  if (params.idPais && name == 'estado') {
    queryParams.append('idPais', params.idPais)
  }

  if (params.idGiro && name == 'actividades') {
    queryParams.append('idGiro', params.idGiro)
  }

  if (params.idServicio && name == 'tipoDocumento') {
    queryParams.append('idServicio', params.idServicio)
  }

  if (params.idDocumento && name == 'tipoIdentificacion') {
    queryParams.append('idDocumento', params.idDocumento)
  }

  return makeRequest<T>({
    method: 'GET',
    endpoint: endpoint,
    params: queryParams,
    responseEncoding: 'iso-8859-1',
  })
}

/**
 * Makes a request to the Kuspit API or similar endpoints.
 * @template T - The expected response type.
 * @param {RequestOptions} options - Request configuration.
 * @returns {Promise<T>} The parsed response data.
 * @throws {AppError} On request failure.
 */
export async function makeRequest<T>(options: RequestOptions): Promise<T> {
  const {
    method,
    endpoint,
    params,
    token,
    responseType = 'json',
    responseEncoding = 'utf-8' } = options
  let url

  const startTime = Date.now()

  try {
    const baseUrl = appConfig.get<string>('kuspit.apiUrl')
    url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

    let body: BodyInit | null | undefined = undefined
    const headers: HeadersInit = {}

    if (token) {
      logger.info(token)
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

    const sanitizedHeaders = {
      ...headers,
      Authorization: token ? `Bearer ${token.substring(0, 5)}...[HIDDEN]` : 'None',
    }

    logger.info(`🚀 [REQ] ${method} ${url}`)
    logger.info(`Headers: ${JSON.stringify(sanitizedHeaders)}`)

    const fetchOptions: RequestInit = {
      method,
      headers,
      // Conditionally include body only if defined (avoids body: undefined)
      ...(body !== undefined ? { body } : {}),
    }

    const response = await fetch(url, fetchOptions)

    const duration = Date.now() - startTime

    const arrayBuffer = await response.arrayBuffer()
    const decoder = new TextDecoder(responseEncoding)
    const decodedText = decoder.decode(arrayBuffer)

    if (!response.ok) {
      let errorJson = null

      try {
        errorJson = JSON.parse(decodedText)
      }
      catch (e) {
        logger.info(e, 'Failed to parse error JSON')
      }

      const errorBody = errorJson as { error?: { codigo: string, mensaje: string } } | null

      // Handle "Validación en proceso" (Code 202) as a valid state
      // Even though HTTP status is 400, Business logic says "Wait for Webhook"
      if (response.status === 400 && errorJson?.error?.codigo === '202') {
        logger.info({ endpoint }, 'Kuspit returned 202 (Validation in Progress). Handling as Pending Success.')

        // We return the error object as if it were a success response (T)
        // The Service layer must check if it contains "error" or "success" data.
        return errorBody as unknown as T
      }

      // For any other error, we THROW as before
      logger.warn(`API call failed. Status: ${response.status}, Error: ${decodedText}, Duration: ${duration}ms`)
      throw new AppError(response.status, `API call failed: ${decodedText || 'Unknown error'}`)
    }

    logger.info({ url, method, sanitizedHeaders, body, response, duration })

    let data: T
    if (responseType === 'json') {
      try {
        data = JSON.parse(decodedText) as T
      }
      catch (e) {
        throw new AppError(500, `Failed to parse JSON response from ${endpoint}. ${e}`)
      }
    }
    else {
      data = decodedText as unknown as T
    }

    logger.info(`API call successful for ${endpoint}: ${JSON.stringify(data)}`)
    return data
  }
  catch (error) {
    logger.error({ error }, `Internal error in makeRequest for ${endpoint}`)
    throw new AppError(500, `Internal error in API call ${url} ${endpoint}`)
  }
}
