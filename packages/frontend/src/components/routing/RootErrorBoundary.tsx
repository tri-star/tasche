import * as Sentry from "@sentry/react"
import { useEffect } from "react"
import { useRouteError } from "react-router-dom"
import { AppErrorFallback } from "@/components/common/AppErrorFallback"

/**
 * React Router のルート `errorElement` として使用するコンポーネント。
 *
 * `createBrowserRouter` はルート描画/ローダーのエラーを内部で捕捉するため、
 * `RouterProvider` より上位の React ErrorBoundary（Sentry.ErrorBoundary含む）には
 * 伝播しない。そのため、ここで明示的に `Sentry.captureException` を呼び出す。
 *
 * `Sentry.captureException` は Sentry 未初期化（DSN未設定）でも安全に呼び出せる（no-op）。
 */
export function RootErrorBoundary() {
  const error = useRouteError()

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return <AppErrorFallback />
}
