import { Button } from "@/components/ui/button"

/**
 * 未捕捉エラー発生時に表示する共通フォールバックUI。
 *
 * `RootErrorBoundary`（ルートの errorElement）と `Sentry.ErrorBoundary`（main.tsx）の
 * 両方から利用される。
 */
export function AppErrorFallback() {
  const handleReload = () => window.location.reload()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <p className="text-foreground text-lg font-medium">エラーが発生しました</p>
        <p className="text-muted-foreground text-sm">
          お手数ですが、ページを再読み込みしてもう一度お試しください。
        </p>
        <Button onClick={handleReload}>再読み込み</Button>
      </div>
    </div>
  )
}
