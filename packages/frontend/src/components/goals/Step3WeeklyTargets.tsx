import type { DailyAvailableUnits, DailyTargets, DayOfWeek } from "@/api/generated/model"
import { Button } from "@/components/ui/button"
import { DAY_LABELS, DAYS_OF_WEEK_ORDER } from "@/lib/week-dates"
import type { GoalTask } from "./types"
import { WeeklyTargetGrid } from "./WeeklyTargetGrid"

type Step3Props = {
  tasks: GoalTask[]
  weeklyTargets: Record<string, DailyTargets>
  dailyAvailableUnits: DailyAvailableUnits
  onUpdateTargets: (taskId: string, targets: DailyTargets) => void
  onNext: () => void
  onBack: () => void
}

function getExceededDays(
  tasks: GoalTask[],
  weeklyTargets: Record<string, DailyTargets>,
  dailyAvailableUnits: DailyAvailableUnits,
) {
  return DAYS_OF_WEEK_ORDER.filter((day) => {
    const total = tasks.reduce((sum, task) => sum + (weeklyTargets[task.id]?.[day] ?? 0), 0)
    return total > (dailyAvailableUnits[day] ?? 0)
  })
}

export function Step3WeeklyTargets({
  tasks,
  weeklyTargets,
  dailyAvailableUnits,
  onUpdateTargets,
  onNext,
  onBack,
}: Step3Props) {
  const exceededDays = getExceededDays(tasks, weeklyTargets, dailyAvailableUnits)
  const exceededDaySet = new Set<DayOfWeek>(exceededDays)
  const exceededDayLabels = exceededDays.map((day) => DAY_LABELS[day]).join("・")

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-emerald-900">各タスクの曜日ごとの目標を設定</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          0.5ユニットずつ調整できます。まずはざっくりでOKです。
        </p>
      </div>

      <WeeklyTargetGrid
        tasks={tasks}
        weeklyTargets={weeklyTargets}
        dailyAvailableUnits={dailyAvailableUnits}
        exceededDays={exceededDaySet}
        onUpdateTargets={onUpdateTargets}
      />

      {exceededDays.length > 0 ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {exceededDayLabels}曜日の目標合計が、確保可能ユニットを超えています。
        </p>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          ← 戻る
        </Button>
        <Button onClick={onNext} disabled={exceededDays.length > 0}>
          次へ →
        </Button>
      </div>
    </div>
  )
}
