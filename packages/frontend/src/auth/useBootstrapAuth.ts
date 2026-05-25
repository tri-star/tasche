import { useSetAtom } from "jotai"
import { useEffect, useRef } from "react"
import { currentSettingsAtom } from "@/settings/atoms"
import type { Settings } from "@/settings/types"
import { accessTokenAtom, authStatusAtom, currentUserAtom } from "./atoms"
import type { AuthUser, TokenResponse } from "./types"

/**
 * アプリ起動時に一度だけ /api/auth/refresh を呼び、
 * リフレッシュ Cookie が有効であればアクセストークンを取得してログイン状態を復元する。
 * 並列で /api/users/me と /api/settings を取得し、各 atom を初期化する。
 *
 * React 19 の StrictMode 下での二重呼び出しを ref で抑制
 */
export function useBootstrapAuth(): void {
  const setAccessToken = useSetAtom(accessTokenAtom)
  const setAuthStatus = useSetAtom(authStatusAtom)
  const setCurrentUser = useSetAtom(currentUserAtom)
  const setCurrentSettings = useSetAtom(currentSettingsAtom)
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

        // ユーザー情報と設定を並列で取得（latency を抑えるため）
        const headers = { Authorization: `Bearer ${access_token}` }
        const [userRes, settingsRes] = await Promise.all([
          fetch("/api/users/me", { headers, credentials: "include" }),
          fetch("/api/settings", { headers, credentials: "include" }),
        ])

        if (userRes.ok) {
          const userJson = await userRes.json()
          const user = (userJson as { data: AuthUser }).data
          setCurrentUser(user)
        }

        if (settingsRes.ok) {
          const settingsJson = await settingsRes.json()
          const settings = (settingsJson as { data: Settings }).data
          setCurrentSettings(settings)
        }
        // settings 取得失敗は致命的ではない: theme は light フォールバック、authStatus は authenticated 継続

        setAuthStatus("authenticated")
      } catch {
        setAuthStatus("anonymous")
      }
    }

    bootstrap()
  }, [setAccessToken, setAuthStatus, setCurrentUser, setCurrentSettings])
}
