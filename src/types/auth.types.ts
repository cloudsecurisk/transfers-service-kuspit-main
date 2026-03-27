// Object representing roles in the legacy system
export interface LegacyRole {
  id: number
  name: string
  value: number
  description?: string
}

// The user object (userData)
export interface LegacyUser {
  id: number
  email: string
  name?: string
  lastName?: string

  // Permissions and role
  crole: LegacyRole

  // Extra properties that come from the token or user
  product?: string
  status?: number
}

// The commerce object (a reduced version that comes in the Auth response)
export interface LegacyAuthCommerce {
  id: number
  commerceName: string
  idUser?: number
  // Role of the user in the commerce
  roleTransfer?: {
    id: number
    name: string
  }
}

// The payload of data within the response
export interface AuthPayload {
  user: LegacyUser
  commerce?: LegacyAuthCommerce
}

// The response HTTP complete of the Auth service
export interface AuthResponse {
  payload: AuthPayload
  error?: boolean
  message?: string
  status?: number
}
