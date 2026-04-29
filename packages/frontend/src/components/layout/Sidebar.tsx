import { HelpCircle, Home, Settings, Target, User } from "lucide-react"
import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

type NavItem = {
  icon: ReactNode
  label: string
  href: string
  end?: boolean
}

type SidebarProps = {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const mainNavItems: NavItem[] = [
    { icon: <Home className="h-5 w-5" />, label: "ダッシュボード", href: "/", end: true },
    { icon: <Target className="h-5 w-5" />, label: "目標設定", href: "/goals" },
    { icon: <Settings className="h-5 w-5" />, label: "設定", href: "/settings" },
  ]

  const bottomNavItems: NavItem[] = [
    { icon: <HelpCircle className="h-5 w-5" />, label: "ヘルプ", href: "/help" },
    { icon: <User className="h-5 w-5" />, label: "アカウント", href: "/account" },
  ]

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-accent text-accent-foreground font-medium"
        : "text-muted-foreground hover:bg-muted",
    )

  return (
    <aside className={cn("flex w-60 flex-col bg-white border-r", className)}>
      {/* メインナビゲーション */}
      <nav className="flex-1 px-3 pt-6">
        <ul className="space-y-1">
          {mainNavItems.map((item) => (
            <li key={item.href}>
              <NavLink to={item.href} end={item.end} className={linkClassName}>
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* 下部ナビゲーション */}
      <nav className="px-3 pb-6">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => (
            <li key={item.href}>
              <NavLink to={item.href} end={item.end} className={linkClassName}>
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
