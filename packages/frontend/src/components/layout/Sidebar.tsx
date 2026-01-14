import { HelpCircle, Home, Settings, Target, User } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = {
  icon: React.ReactNode
  label: string
  href: string
  active?: boolean
}

type SidebarProps = {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const mainNavItems: NavItem[] = [
    { icon: <Home className="h-5 w-5" />, label: "ダッシュボード", href: "/", active: true },
    { icon: <Target className="h-5 w-5" />, label: "目標設定", href: "/goals" },
    { icon: <Settings className="h-5 w-5" />, label: "設定", href: "/settings" },
  ]

  const bottomNavItems: NavItem[] = [
    { icon: <HelpCircle className="h-5 w-5" />, label: "ヘルプ", href: "/help" },
    { icon: <User className="h-5 w-5" />, label: "アカウント", href: "/account" },
  ]

  return (
    <aside className={cn("flex w-60 flex-col bg-white border-r", className)}>
      {/* メインナビゲーション */}
      <nav className="flex-1 px-3 pt-6">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  item.active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.icon}
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 下部ナビゲーション */}
      <nav className="px-3 pb-6">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                {item.icon}
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
