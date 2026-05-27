import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

type NoGoalsEmptyStateProps = {
  onClickGoalSetting: () => void
}

export function NoGoalsEmptyState({ onClickGoalSetting }: NoGoalsEmptyStateProps) {
  return (
    <section
      aria-label="今週の目標 未設定"
      className="flex flex-col items-center justify-center gap-6 py-16"
    >
      <img
        src="/images/dashboard/dashboard-widget-illust1.png"
        alt=""
        aria-hidden
        className="w-48 object-contain"
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-semibold">今週はまだ予定がありません</h2>
        <p className="text-sm text-muted-foreground">
          目標を設定して、今週の習慣化を始めましょう。
        </p>
      </div>
      <Button onClick={onClickGoalSetting} aria-label="目標を設定する" className="gap-2">
        <Sparkles className="h-4 w-4" />
        目標を設定する
      </Button>
    </section>
  )
}
