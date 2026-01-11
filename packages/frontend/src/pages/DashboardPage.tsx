import { Link } from 'react-router-dom'

import { Card } from '@/shared/ui/Card'
import { RecordWidget } from '@/widgets/dashboard/RecordWidget'
import { TodayGoalsWidget } from '@/widgets/dashboard/TodayGoalsWidget'
import { WeeklyMatrix } from '@/widgets/dashboard/WeeklyMatrix'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">ダッシュボード</h1>
        <Link
          to="/goals"
          className="rounded-lg bg-lime-600 px-3 py-2 text-sm font-medium text-white hover:bg-lime-700"
        >
          目標設定
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TodayGoalsWidget />
        <RecordWidget />
      </div>

      <Card title="週間達成状況 (タスク×曜日)">
        <WeeklyMatrix />
      </Card>
    </div>
  )
}
