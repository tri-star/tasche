import type { DailyTargets, DayOfWeek } from "@/api/generated/model"
import { DAY_LABELS, DAYS_OF_WEEK_ORDER } from "@/lib/week-dates"
import type { GoalTask } from "./types"
import { createEmptyTargets } from "./types"

type WeeklyTargetGridProps = {
  tasks: GoalTask[]
  weeklyTargets: Record<string, DailyTargets>
  onUpdateTargets: (taskId: string, targets: DailyTargets) => void
}

export function WeeklyTargetGrid({ tasks, weeklyTargets, onUpdateTargets }: WeeklyTargetGridProps) {
  const totalsByDay = DAYS_OF_WEEK_ORDER.reduce(
    (acc, day) => {
      acc[day] = tasks.reduce((sum, task) => sum + (weeklyTargets[task.id]?.[day] ?? 0), 0)
      return acc
    },
    {} as Record<DayOfWeek, number>,
  )

  return (
    <div className="overflow-x-auto rounded-3xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
      <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-muted-foreground">
            <th className="px-2 text-left">タスク</th>
            {DAYS_OF_WEEK_ORDER.map((day) => (
              <th key={day} className="px-2 text-center font-semibold">
                {DAY_LABELS[day]}
              </th>
            ))}
            <th className="px-2 text-center">合計</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const targets = weeklyTargets[task.id]
            const rowTotal = DAYS_OF_WEEK_ORDER.reduce((sum, day) => sum + (targets?.[day] ?? 0), 0)
            return (
              <tr key={task.id} className="rounded-2xl bg-amber-50/40">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <img
                      src="/images/dashboard/task-icon.png"
                      alt=""
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-emerald-900">{task.name}</span>
                  </div>
                </td>
                {DAYS_OF_WEEK_ORDER.map((day) => (
                  <td key={day} className="px-2 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={targets?.[day] ?? 0}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value)
                        onUpdateTargets(task.id, {
                          ...(targets ?? createEmptyTargets()),
                          [day]: Number.isFinite(nextValue) ? nextValue : 0,
                        })
                      }}
                      className="w-16 rounded-lg border border-emerald-100 bg-white px-2 py-1 text-center text-sm focus:border-emerald-300 focus:outline-none"
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center font-semibold text-emerald-800">
                  {rowTotal.toFixed(1)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-emerald-50/80 font-semibold text-emerald-900">
            <td className="px-2 py-3">合計</td>
            {DAYS_OF_WEEK_ORDER.map((day) => (
              <td key={day} className="px-2 py-3 text-center">
                {totalsByDay[day].toFixed(1)}
              </td>
            ))}
            <td className="px-2 py-3 text-center">
              {DAYS_OF_WEEK_ORDER.reduce((sum, day) => sum + totalsByDay[day], 0).toFixed(1)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
