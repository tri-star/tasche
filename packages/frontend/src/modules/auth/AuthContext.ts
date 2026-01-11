import { createContext } from 'react'

export type User = {
  name: string
  provider: 'google' | 'github'
}

type LoginArgs = {
  provider: User['provider']
}

export type AuthContextValue = {
  isAuthenticated: boolean
  user: User | null
  accessToken: string | null
  login: (args: LoginArgs) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
