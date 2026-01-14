import type { TodayGoal } from "@/api/generated/model"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

type TodayGoalsWidgetProps = {
  date: string
  goals: TodayGoal[]
  onToggleGoal?: (taskId: string, checked: boolean) => void
}

export function TodayGoalsWidget({ date, goals, onToggleGoal }: TodayGoalsWidgetProps) {
  return (
    <Card className="relative overflow-hidden">
      {/* 右上イラスト */}
      <img
        src="/images/dashboard/dashboard-widget-illust1.png"
        alt=""
        className="absolute right-2 top-2 h-12 w-12 object-contain"
        aria-hidden="true"
      />

      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <img
          src="/images/dashboard/dashboard-widget-icon1.png"
          alt=""
          className="h-7 w-7 object-contain"
        />
        <div>
          <CardTitle className="text-lg">今日の目標</CardTitle>
          <p className="text-sm text-muted-foreground">{date}</p>
        </div>
      </CardHeader>

      <CardContent>
        <ul className="relative z-10 space-y-3">
          {goals.map((goal) => (
            <li key={goal.task_id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="/images/dashboard/task-icon.png"
                  alt=""
                  className="h-5 w-5 object-contain"
                />
                <span className="text-sm">{goal.task_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {goal.target_units} unit{goal.target_units !== 1 ? "s" : ""}
                </span>
                <Checkbox
                  checked={goal.actual_units >= goal.target_units}
                  onCheckedChange={(checked) => onToggleGoal?.(goal.task_id, checked as boolean)}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      {/* 右下の植物イラスト（背景） */}
      <img
        src="/images/dashboard/widget-background.png"
        alt=""
        className="absolute bottom-0 right-4 h-12 w-12 object-contain opacity-80"
        aria-hidden="true"
      />
    </Card>
  )
}
