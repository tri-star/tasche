import type { DailyAvailableUnits, DailyTargets, DayOfWeek } from "@/api/generated/model"
import { DAY_LABELS, DAYS_OF_WEEK_ORDER } from "@/lib/week-dates"
import type { GoalTask } from "./types"
import { createEmptyTargets } from "./types"

type WeeklyTargetGridProps = {
  tasks: GoalTask[]
  weeklyTargets: Record<string, DailyTargets>
  dailyAvailableUnits: DailyAvailableUnits
  exceededDays: ReadonlySet<DayOfWeek>
  onUpdateTargets: (taskId: string, targets: DailyTargets) => void
}

export function WeeklyTargetGrid({
  tasks,
  weeklyTargets,
  dailyAvailableUnits,
  exceededDays,
  onUpdateTargets,
}: WeeklyTargetGridProps) {
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
                  <td
                    key={day}
                    className={`px-2 py-2 text-center ${
                      exceededDays.has(day) ? "bg-rose-50/80" : ""
                    }`}
                  >
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
                      className={`w-16 rounded-lg border bg-white px-2 py-1 text-center text-sm focus:outline-none ${
                        exceededDays.has(day)
                          ? "border-rose-300 focus:border-rose-400"
                          : "border-emerald-100 focus:border-emerald-300"
                      }`}
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
            <td className="px-2 py-3">目標合計 / 確保可能</td>
            {DAYS_OF_WEEK_ORDER.map((day) => {
              const isExceeded = exceededDays.has(day)
              return (
                <td
                  key={day}
                  className={`px-2 py-3 text-center ${isExceeded ? "bg-rose-100 text-rose-700" : ""}`}
                >
                  {totalsByDay[day].toFixed(1)} / {(dailyAvailableUnits[day] ?? 0).toFixed(1)}
                </td>
              )
            })}
            <td className="px-2 py-3 text-center">
              {DAYS_OF_WEEK_ORDER.reduce((sum, day) => sum + totalsByDay[day], 0).toFixed(1)} /{" "}
              {DAYS_OF_WEEK_ORDER.reduce(
                (sum, day) => sum + (dailyAvailableUnits[day] ?? 0),
                0,
              ).toFixed(1)}
            </td>
          </tr>
          <tr className="text-xs text-muted-foreground">
            <td className="px-2 py-2">確保可能との差分</td>
            {DAYS_OF_WEEK_ORDER.map((day) => {
              const remaining = (dailyAvailableUnits[day] ?? 0) - totalsByDay[day]
              return (
                <td
                  key={day}
                  className={`px-2 py-2 text-center ${
                    remaining < 0 ? "font-semibold text-rose-700" : ""
                  }`}
                >
                  {remaining.toFixed(1)}
                </td>
              )
            })}
            <td className="px-2 py-2 text-center">
              {DAYS_OF_WEEK_ORDER.reduce(
                (sum, day) => sum + (dailyAvailableUnits[day] ?? 0) - totalsByDay[day],
                0,
              ).toFixed(1)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
