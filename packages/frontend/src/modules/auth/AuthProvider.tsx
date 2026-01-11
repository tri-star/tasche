import { ReactNode, useMemo, useState } from 'react'

import { AuthContext, type User, type AuthContextValue } from '@/modules/auth/AuthContext'

const sessionKey = 'tasche_access_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    // MVP仕様ではAccess Tokenはメモリ保持。ただ、開発中のリロード耐性のため sessionStorage から復帰。
    return window.sessionStorage.getItem(sessionKey)
  })

  const [user, setUser] = useState<User | null>(() => {
    return accessToken ? { name: 'Dev User', provider: 'google' } : null
  })

  const value = useMemo<AuthContextValue>(() => {
    return {
      isAuthenticated: Boolean(accessToken),
      user,
      accessToken,
      login: ({ provider }) => {
        const token = `dummy-${provider}-${Date.now()}`
        setAccessToken(token)
        window.sessionStorage.setItem(sessionKey, token)
        setUser({ name: 'Dev User', provider })
      },
      logout: () => {
        setAccessToken(null)
        setUser(null)
        window.sessionStorage.removeItem(sessionKey)
      },
    }
  }, [accessToken, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
