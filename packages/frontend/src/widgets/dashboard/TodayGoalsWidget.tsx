import { Card } from '@/shared/ui/Card'

const sample = [
  { taskName: '英語学習', targetUnits: 2.0, actualUnits: 1.5, completionRate: 75 },
  { taskName: '個人開発', targetUnits: 0, actualUnits: 0, completionRate: null as number | null },
]

export function TodayGoalsWidget() {
  const today = new Date()

  return (
    <Card title="今日の目標">
      <div className="mb-3 text-xs text-slate-500">
        {today.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        })}
      </div>

      <div className="space-y-2">
        {sample.map((x) => (
          <div
            key={x.taskName}
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
          >
            <div className="font-medium">{x.taskName}</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              目標 {x.targetUnits} / 実績 {x.actualUnits}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-slate-500">後で `/api/dashboard` に接続します。</div>
    </Card>
  )
}
