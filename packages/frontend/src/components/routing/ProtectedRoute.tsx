import { useAtomValue } from "jotai"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { authStatusAtom } from "@/auth/atoms"

function FullscreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-tasche-ivory">
      <div className="text-tasche-textSub text-sm">読み込み中...</div>
    </div>
  )
}

/**
 * 認証ガードコンポーネント
 * - loading: スピナーを表示
 * - anonymous/error: /login にリダイレクト
 * - authenticated: children（Outlet）を描画
 */
export function ProtectedRoute() {
  const status = useAtomValue(authStatusAtom)
  const location = useLocation()

  if (status === "loading") {
    return <FullscreenSpinner />
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
