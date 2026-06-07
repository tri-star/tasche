import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { LoginLayout } from "@/components/login/LoginLayout"

/**
 * Google OAuth コールバックページ
 * /auth/callback?code=...&state=... を処理する中間ページ
 *
 * StrictMode 下での二重実行を useRef で抑制（code は1回しか使えないため必須）
 */
export function AuthCallbackPage() {
  const { handleCallback } = useAuth()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const called = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: マウント時に1回だけ実行するため依存配列は空
  useEffect(() => {
    if (called.current) return
    called.current = true

    let canceled = false

    ;(async () => {
      try {
        await handleCallback(searchParams)
      } catch (e) {
        if (!canceled) {
          setError(String((e as Error).message ?? e))
        }
      }
    })()

    return () => {
      canceled = true
    }
  }, [])

  if (error) {
    return (
      <LoginLayout>
        <p role="alert" className="text-destructive mb-4">
          ログインに失敗しました: {error}
        </p>
        <Link to="/login" className="text-primary underline">
          ログイン画面に戻る
        </Link>
      </LoginLayout>
    )
  }

  return (
    <LoginLayout>
      <p className="text-muted-foreground">ログイン処理中...</p>
    </LoginLayout>
  )
}
