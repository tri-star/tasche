import { useSetAtom } from "jotai"
import { useEffect, useRef } from "react"
import { accessTokenAtom, authStatusAtom, currentUserAtom } from "./atoms"
import type { AuthUser, TokenResponse } from "./types"

/**
 * アプリ起動時に一度だけ /api/auth/refresh を呼び、
 * リフレッシュ Cookie が有効であればアクセストークンを取得してログイン状態を復元する
 *
 * React 19 の StrictMode 下での二重呼び出しを ref で抑制
 */
export function useBootstrapAuth(): void {
  const setAccessToken = useSetAtom(accessTokenAtom)
  const setAuthStatus = useSetAtom(authStatusAtom)
  const setCurrentUser = useSetAtom(currentUserAtom)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function bootstrap() {
      try {
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        })

        if (!refreshRes.ok) {
          setAuthStatus("anonymous")
          return
        }

        const refreshJson = await refreshRes.json()
        const tokenData = (refreshJson as { data: TokenResponse }).data
        const { access_token } = tokenData

        setAccessToken(access_token)

        // ユーザー情報を取得
        const userRes = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${access_token}` },
          credentials: "include",
        })

        if (userRes.ok) {
          const userJson = await userRes.json()
          const user = (userJson as { data: AuthUser }).data
          setCurrentUser(user)
        }

        setAuthStatus("authenticated")
      } catch {
        setAuthStatus("anonymous")
      }
    }

    bootstrap()
  }, [setAccessToken, setAuthStatus, setCurrentUser])
}
