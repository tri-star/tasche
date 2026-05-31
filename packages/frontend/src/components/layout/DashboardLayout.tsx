import { Bell } from "lucide-react"
import { Link } from "react-router-dom"
import { Sidebar } from "./Sidebar"

type DashboardLayoutProps = {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 text-card-foreground backdrop-blur md:px-6">
        <Link to="/" aria-label="ダッシュボードへ移動" className="flex min-w-0 items-center gap-2">
          <img src="/images/dashboard/logo.png" alt="Tasche" className="h-8 w-auto" />
        </Link>
        <button
          type="button"
          aria-label="通知"
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-6 w-6" />
        </button>
      </header>

      <div className="flex min-w-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 justify-center">
          <main className="w-full min-w-0 max-w-6xl px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-6 md:py-6 md:pb-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
