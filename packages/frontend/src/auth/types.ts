export type AuthUser = {
  id: string
  email: string
  name: string
  picture?: string
  timezone?: string
}

export type TokenResponse = {
  access_token: string
  token_type: "Bearer"
  expires_in: number
}
