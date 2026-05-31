import { ClipboardList, Home, Settings, Target, User } from "lucide-react"
import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

type NavItem = {
  icon: ReactNode
  label: string
  mobileLabel?: string
  href: string
  end?: boolean
}

type SidebarProps = {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const navItems: NavItem[] = [
    {
      icon: <Home className="h-5 w-5 shrink-0" />,
      label: "ダッシュボード",
      mobileLabel: "ホーム",
      href: "/",
      end: true,
    },
    {
      icon: <ClipboardList className="h-5 w-5 shrink-0" />,
      label: "タスク管理",
      mobileLabel: "タスク",
      href: "/tasks",
    },
    { icon: <Target className="h-5 w-5 shrink-0" />, label: "目標設定", href: "/goals" },
    { icon: <Settings className="h-5 w-5 shrink-0" />, label: "設定", href: "/settings" },
    { icon: <User className="h-5 w-5 shrink-0" />, label: "アカウント", href: "/account" },
  ]

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:h-10 md:flex-row md:px-0 lg:justify-start lg:gap-3 lg:px-3 lg:text-sm",
      isActive
        ? "bg-accent text-accent-foreground font-medium"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )

  return (
    <aside
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 text-card-foreground backdrop-blur md:sticky md:top-16 md:h-[calc(100dvh-4rem)] md:w-20 md:shrink-0 md:border-r md:border-t-0 md:px-3 md:py-6 lg:w-60",
        className,
      )}
    >
      <nav aria-label="アプリナビゲーション" className="h-full">
        <ul className="grid grid-cols-5 gap-1 md:flex md:h-full md:flex-col">
          {navItems.map((item) => (
            <li key={item.href} className={item.href === "/account" ? "md:mt-auto" : undefined}>
              <NavLink
                to={item.href}
                end={item.end}
                aria-label={item.label}
                title={item.label}
                className={linkClassName}
              >
                {item.icon}
                <span className="max-w-full truncate md:sr-only lg:not-sr-only">
                  <span className="lg:hidden">{item.mobileLabel ?? item.label}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
