import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '@/modules/auth/useAuth'
import { useTheme } from '@/modules/theme/useTheme'

function navClassName({ isActive }: { isActive: boolean }) {
  return [
    'rounded-md px-3 py-2 text-sm font-medium',
    isActive
      ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  ].join(' ')
}

export function Header() {
  const { logout, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <header className="border-b border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-base font-semibold tracking-tight">
            Tasche
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink to="/" className={navClassName} end>
              ダッシュボード
            </NavLink>
            <NavLink to="/tasks" className={navClassName}>
              タスク
            </NavLink>
            <NavLink to="/settings" className={navClassName}>
              設定
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>

          <div className="hidden text-xs text-slate-500 sm:block">{user?.name ?? ''}</div>

          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  )
}
