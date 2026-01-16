import type { DailyTargets } from "@/api/generated/model"
import { Button } from "@/components/ui/button"
import type { GoalTask } from "./types"
import { WeeklyTargetGrid } from "./WeeklyTargetGrid"

type Step3Props = {
  tasks: GoalTask[]
  weeklyTargets: Record<string, DailyTargets>
  onUpdateTargets: (taskId: string, targets: DailyTargets) => void
  onNext: () => void
  onBack: () => void
}

export function Step3WeeklyTargets({
  tasks,
  weeklyTargets,
  onUpdateTargets,
  onNext,
  onBack,
}: Step3Props) {
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
        onUpdateTargets={onUpdateTargets}
      />

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          ← 戻る
        </Button>
        <Button onClick={onNext}>次へ →</Button>
      </div>
    </div>
  )
}
