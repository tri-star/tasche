import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { TodayGoal } from "@/api/generated/model";

type TodayGoalsWidgetProps = {
  date: string;
  goals: TodayGoal[];
  onToggleGoal?: (taskId: string, checked: boolean) => void;
};

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

      <CardContent className="relative pb-16">
        <ul className="space-y-3">
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
                  onCheckedChange={(checked) =>
                    onToggleGoal?.(goal.task_id, checked as boolean)
                  }
                />
              </div>
            </li>
          ))}
        </ul>

        {/* 右下の植物イラスト */}
        <div className="absolute bottom-2 right-2">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 35V20" stroke="hsl(122 39% 49%)" strokeWidth="2" />
            <path d="M20 20C15 15 10 18 10 25" stroke="hsl(122 39% 49%)" strokeWidth="2" fill="none" />
            <path d="M20 20C25 15 30 18 30 25" stroke="hsl(122 39% 49%)" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
