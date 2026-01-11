import { useMemo } from 'react'

import { useAuth } from '@/modules/auth/useAuth'
import { useTheme } from '@/modules/theme/useTheme'
import { Card } from '@/shared/ui/Card'

export function SettingsPage() {
  const { logout, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">設定</h1>

      <Card title="アカウント（仮）">
        <div className="text-sm text-slate-700 dark:text-slate-200">
          {user?.name ?? '未ログイン'}
        </div>
        <div className="text-xs text-slate-500">provider: {user?.provider ?? '-'}</div>
      </Card>

      <Card title="タイムゾーン">
        <div className="text-sm">{tz}</div>
        <div className="mt-1 text-xs text-slate-500">ブラウザから自動検出（MVP要件）</div>
      </Card>

      <Card title="外観">
        <div className="flex items-center justify-between">
          <div className="text-sm">ダークモード</div>
          <button
            type="button"
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? 'ON' : 'OFF'}
          </button>
        </div>
      </Card>

      <div>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={logout}
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}
