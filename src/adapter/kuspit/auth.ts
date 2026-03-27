import { makeRequest } from './utils.ts'

export interface KuspitLinkParams {
  idt: number
  scope: string
  response_type?: string // Default: "code"
  redirect_uri: string
  client_id: string
  state: number
  passwordLogin: string
  correoLogin: string
  idExterno: number
  aceptaCond: 0 | 1
}

export interface KuspitLinkResponse {
  code: string
  state: string
  idExterno: string
}

export interface TokenRequestParams {
  grant_type: 'authorization_code'
  client_id: string
  client_secret: string
  redirect_uri: string
  code: string
}

export interface TokenRefreshParams {
  grant_type: 'refresh_token'
  client_id: string
  client_secret: string
  redirect_uri: string
  refresh_token: string
}

export interface TokenResponse {
  clabeBanco: string
  usuario: string
  idBanco: number
  expires_in: number
  refresh_token: string
  access_token: string
  clabeKuspit: string
  contrato: string
}

export interface RefreshResponse {
  expires_in: number
  access_token: string
}

/**
 * Links client to Kuspit via /authorization endpoint.
 * @param {KuspitLinkParams} params - Parameters for client linking.
 * @returns {Promise<KuspitLinkResponse>} The link response containing code and state.
 * @throws {AppError} On request failure.
 */
export async function linkClient(params: KuspitLinkParams): Promise<KuspitLinkResponse> {
  // Body as form-urlencoded
  const bodyParams = new URLSearchParams({
    response_type: params.response_type || 'code',
    redirect_uri: params.redirect_uri,
    client_id: params.client_id,
    state: params.state.toString(),
    idt: params.idt.toString(),
    scope: params.scope,
    passwordLogin: params.passwordLogin,
    correoLogin: params.correoLogin,
    idExterno: params.idExterno.toString(),
    aceptaCond: params.aceptaCond.toString(),
  })

  return makeRequest<KuspitLinkResponse>({
    method: 'POST',
    endpoint: `v3/authorization`,
    params: bodyParams,
  })
}

/**
 * Requests an access token using the authorization code.
 * @param {TokenRequestParams} params - The parameters for token request.
 * @returns {Promise<TokenResponse>} The token response data.
 */
export async function requestToken(params: TokenRequestParams): Promise<TokenResponse> {
  // Body as form-urlencoded (standard OAuth)
  const bodyParams = new URLSearchParams({
    grant_type: params.grant_type,
    client_id: params.client_id,
    client_secret: params.client_secret,
    redirect_uri: params.redirect_uri,
    code: params.code,
  })

  return makeRequest<TokenResponse>({
    method: 'POST',
    endpoint: 'token/request',
    params: bodyParams,
  })
}

/**
 * Refreshes the access token using the refresh token.
 * @param {TokenRefreshParams} params - The parameters for token refresh.
 * @returns {Promise<RefreshResponse>} The refreshed token data.
 */
export async function refreshToken(params: TokenRefreshParams): Promise<RefreshResponse> {
  // Body as form-urlencoded (standard OAuth)
  const bodyParams = new URLSearchParams({
    grant_type: params.grant_type,
    client_id: params.client_id,
    client_secret: params.client_secret,
    redirect_uri: params.redirect_uri,
    refresh_token: params.refresh_token,
  })

  return makeRequest<RefreshResponse>({
    method: 'POST',
    endpoint: 'token/refresh',
    params: bodyParams,
  })
}
