import { useState } from "react"

type Props = {
  onLogin: (email: string, name?: string) => Promise<void>
  defaultEmail?: string
}

/**
 * スタブログインボタン（開発・テスト用）
 * VITE_AUTH_STUB_ENABLED=true のときのみ LoginPage から描画される
 * このコンポーネント自体は環境変数を参照しない（テスト容易性のため props で制御）
 */
export function StubLoginButton({ onLogin, defaultEmail = "test-user@example.com" }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      await onLogin(defaultEmail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="mt-4 inline-flex items-center justify-center
                 w-[320px] max-w-full px-6 py-3
                 bg-gray-100 hover:bg-gray-200 rounded-pill
                 text-[13px] font-medium text-tasche-textSub
                 transition-colors duration-150
                 disabled:opacity-60 disabled:pointer-events-none"
    >
      {loading ? "ログイン中..." : "スタブログイン（開発用）"}
    </button>
  )
}
