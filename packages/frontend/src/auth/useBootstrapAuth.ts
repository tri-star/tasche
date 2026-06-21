import { useSetAtom } from "jotai"
import { useEffect, useRef } from "react"
import { currentSettingsAtom } from "@/settings/atoms"
import type { Settings } from "@/settings/types"
import { authStatusAtom, currentUserAtom } from "./atoms"
import type { AuthUser } from "./types"

/**
 * アプリ起動時に一度だけ /api/users/me を叩いてセッションの有無で認証状態を復元する。
 * 並列で /api/settings も取得し、各 atom を初期化する。
 * me が 401 の場合は anonymous（設定の結果は無視する）。
 *
 * React 19 の StrictMode 下での二重呼び出しを ref で抑制
 */
export function useBootstrapAuth(): void {
  const setAuthStatus = useSetAtom(authStatusAtom)
  const setCurrentUser = useSetAtom(currentUserAtom)
  const setCurrentSettings = useSetAtom(currentSettingsAtom)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function bootstrap() {
      try {
        // ユーザー情報と設定を並列で取得（latency を抑えるため）
        const [userRes, settingsRes] = await Promise.all([
          fetch("/api/users/me", { credentials: "include" }),
          fetch("/api/settings", { credentials: "include" }),
        ])

        if (userRes.ok) {
          const userJson = await userRes.json()
          const user = (userJson as { data: AuthUser }).data
          setCurrentUser(user)
          setAuthStatus("authenticated")
        } else if (userRes.status === 401) {
          // 未認証（セッションなし）
          setAuthStatus("anonymous")
          return
        } else {
          // 5xx 等の予期しないエラー
          setAuthStatus("error")
          return
        }

        if (settingsRes.ok) {
          const settingsJson = await settingsRes.json()
          const settings = (settingsJson as { data: Settings }).data
          setCurrentSettings(settings)
        }
        // settings 取得失敗は致命的ではない: theme は light フォールバック、authStatus は authenticated 継続
      } catch {
        setAuthStatus("anonymous")
      }
    }

    bootstrap()
  }, [setAuthStatus, setCurrentUser, setCurrentSettings])
}
