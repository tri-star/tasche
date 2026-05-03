import type { DailyAvailableUnits, DailyTargets } from "@/api/generated/model"
import { Button } from "@/components/ui/button"
import { DAY_LABELS, DAYS_OF_WEEK_ORDER } from "@/lib/week-dates"
import type { GoalTask } from "./types"

type Step4Props = {
  unitDurationMinutes: number
  dailyAvailableUnits: DailyAvailableUnits
  tasks: GoalTask[]
  weeklyTargets: Record<string, DailyTargets>
  onSave: () => void
  onBack: () => void
  isSaving: boolean
  errorMessage?: string | null
}

export function Step4Confirmation({
  unitDurationMinutes,
  dailyAvailableUnits,
  tasks,
  weeklyTargets,
  onSave,
  onBack,
  isSaving,
  errorMessage,
}: Step4Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-emerald-900">設定内容を確認</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ここまでの内容でよければ保存してください。
        </p>
      </div>

      <div className="rounded-3xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">1ユニットの時間</p>
          <p className="text-lg font-semibold text-emerald-900">{unitDurationMinutes}分</p>
        </div>
        <div className="mt-4 border-t border-dashed border-emerald-100 pt-4">
          <p className="text-sm font-semibold text-emerald-900">確保可能ユニット</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {DAYS_OF_WEEK_ORDER.map((day) => (
              <div
                key={day}
                className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50/70 px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">{DAY_LABELS[day]}</span>
                <span className="text-sm font-semibold text-emerald-900">
                  {(dailyAvailableUnits[day] ?? 0).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-2 py-2 text-left">タスク</th>
                {DAYS_OF_WEEK_ORDER.map((day) => (
                  <th key={day} className="px-2 py-2 text-center">
                    {DAY_LABELS[day]}
                  </th>
                ))}
                <th className="px-2 py-2 text-center">合計</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const targets = weeklyTargets[task.id]
                const total = DAYS_OF_WEEK_ORDER.reduce(
                  (sum, day) => sum + (targets?.[day] ?? 0),
                  0,
                )
                return (
                  <tr key={task.id} className="border-t border-dashed border-emerald-100">
                    <td className="px-2 py-3 font-semibold text-emerald-900">{task.name}</td>
                    {DAYS_OF_WEEK_ORDER.map((day) => (
                      <td key={day} className="px-2 py-3 text-center">
                        {(targets?.[day] ?? 0).toFixed(1)}
                      </td>
                    ))}
                    <td className="px-2 py-3 text-center font-semibold">{total.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          ← 戻る
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  )
}
