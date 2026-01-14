import { Bell } from "lucide-react"
import { Sidebar } from "./Sidebar"

type DashboardLayoutProps = {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <img src="/images/dashboard/logo.png" alt="Tasche" className="h-8" />
        </div>
        <button type="button" className="rounded-full p-2 hover:bg-green-50 transition-colors">
          <Bell className="h-6 w-6 text-muted-foreground" />
        </button>
      </header>

      {/* サイドバー + メインコンテンツ */}
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex justify-center">
          <main className="flex-1 px-6 py-6 max-w-6xl ">{children}</main>
        </div>
      </div>
    </div>
  )
}
