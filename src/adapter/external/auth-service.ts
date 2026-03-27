import { appConfig } from '../../config/config.instance.ts'
import { AppError } from '../../shared/error-handler.ts'
import { logger } from '../../shared/logger.ts'
import type { AuthResponse } from '../../types/auth.types.ts'

const OAUTH_URL = appConfig.get<string>('oauth.url')

/**
 * Check if the provided token has permission to access a specific route and method.
 */
export const checkRemotePermission = async (
  token: string,
  route: string,
  method: string,
): Promise<AuthResponse> => {
  const endpoint = 'authorized'
  // Query parameters
  const params = new URLSearchParams({
    route: route,
    module: 'transfer', // Hardcoded module name for transfers
    method: method,
  })

  const url = `${OAUTH_URL}/${endpoint}?${params.toString()}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token, // We send the token as is
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new AppError(403, 'Access denied or session expired.')
      }
      throw new AppError(502, `Error in auth service: ${response.statusText}`)
    }

    const data = await response.json() as unknown
    return data as AuthResponse
  }
  catch (error: unknown) {
    if (error instanceof AppError) throw error
    logger.error({ error, route }, 'Error verifying permissions in Oauth')
    throw new AppError(502, 'Error communicating with the Auth service.')
  }
}
