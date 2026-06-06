import type { DailyAvailableUnits, DailyTargets, DayOfWeek } from "@/api/generated/model"
import { cn } from "@/lib/utils"
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

/** input の aria-label を生成するヘルパー(デスクトップ/モバイルで完全一致させる) */
function targetInputLabel(taskName: string, day: DayOfWeek): string {
  return `${taskName}の${DAY_LABELS[day]}曜日の目標ユニット`
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

  const weeklyTotal = DAYS_OF_WEEK_ORDER.reduce((sum, day) => sum + totalsByDay[day], 0)

  const handleChange = (task: GoalTask, day: DayOfWeek, raw: string) => {
    const nextValue = Number(raw)
    const targets = weeklyTargets[task.id]
    onUpdateTargets(task.id, {
      ...(targets ?? createEmptyTargets()),
      [day]: Number.isFinite(nextValue) ? nextValue : 0,
    })
  }

  return (
    <div
      data-testid="weekly-target-grid"
      className="min-w-0 rounded-3xl border border-emerald-100 bg-white/80 p-4 shadow-sm"
    >
      {/* モバイルレイアウト (md未満): タスクをカード形式で縦積み */}
      <div className="space-y-3 md:hidden" data-testid="weekly-target-cards">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-2xl border border-emerald-100 bg-amber-50/40 p-3">
            {/* タスク名ヘッダー */}
            <div className="mb-2 flex items-center gap-2">
              <img
                src="/images/dashboard/task-icon.png"
                alt=""
                aria-hidden="true"
                className="h-5 w-5"
              />
              <span className="font-semibold text-emerald-900">{task.name}</span>
            </div>

            {/* 曜日ラベル行 */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK_ORDER.map((day) => (
                <span key={day} className="text-center text-xs text-muted-foreground">
                  {DAY_LABELS[day]}
                </span>
              ))}
            </div>

            {/* 入力欄グリッド */}
            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK_ORDER.map((day) => (
                <input
                  key={day}
                  type="number"
                  min={0}
                  step={0.5}
                  value={weeklyTargets[task.id]?.[day] ?? 0}
                  onChange={(e) => handleChange(task, day, e.target.value)}
                  aria-label={targetInputLabel(task.name, day)}
                  className={cn(
                    "w-full min-w-0 rounded-md border bg-white px-1 py-1 text-center text-sm focus:outline-none",
                    exceededDays.has(day)
                      ? "border-rose-300 bg-rose-50/80 focus:border-rose-400"
                      : (dailyAvailableUnits[day] ?? 0) > 0
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-emerald-100 focus:border-emerald-300",
                  )}
                />
              ))}
            </div>
          </div>
        ))}

        {/* 週間合計サマリーカード */}
        <div className="flex items-baseline justify-between rounded-2xl bg-emerald-50/80 px-4 py-3">
          <span className="text-sm font-semibold text-emerald-900">週間合計ユニット</span>
          <span>
            <span className="text-lg font-bold text-emerald-900">{weeklyTotal.toFixed(1)}</span>{" "}
            <span className="text-xs text-muted-foreground">units</span>
          </span>
        </div>
      </div>

      {/* デスクトップレイアウト (md以上): 横スクロール可能なテーブル */}
      <div className="hidden overflow-x-auto md:block" data-testid="weekly-target-scroll">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-muted-foreground">
              <th scope="col" className="px-2 text-left">
                タスク
              </th>
              {DAYS_OF_WEEK_ORDER.map((day) => (
                <th key={day} scope="col" className="px-2 text-center font-semibold">
                  {DAY_LABELS[day]}
                </th>
              ))}
              <th scope="col" className="px-2 text-center">
                合計
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const targets = weeklyTargets[task.id]
              const rowTotal = DAYS_OF_WEEK_ORDER.reduce(
                (sum, day) => sum + (targets?.[day] ?? 0),
                0,
              )
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
                      className={cn(
                        "px-2 py-2 text-center",
                        exceededDays.has(day) ? "bg-rose-50/80" : "",
                      )}
                    >
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={targets?.[day] ?? 0}
                        onChange={(e) => handleChange(task, day, e.target.value)}
                        aria-label={targetInputLabel(task.name, day)}
                        className={cn(
                          "w-16 rounded-lg border bg-white px-2 py-1 text-center text-sm focus:outline-none",
                          exceededDays.has(day)
                            ? "border-rose-300 focus:border-rose-400"
                            : "border-emerald-100 focus:border-emerald-300",
                        )}
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
              <th scope="row" className="px-2 py-3">
                目標合計 / 確保可能
              </th>
              {DAYS_OF_WEEK_ORDER.map((day) => {
                const isExceeded = exceededDays.has(day)
                const targetTotal = totalsByDay[day]
                const availableTotal = dailyAvailableUnits[day] ?? 0
                const isBelowAvailable = targetTotal < availableTotal
                return (
                  <td
                    key={day}
                    className={cn(
                      "px-2 py-3 text-center",
                      isExceeded ? "bg-rose-100 text-rose-700" : "",
                    )}
                  >
                    <span className={isBelowAvailable ? "text-sky-700" : undefined}>
                      {targetTotal.toFixed(1)}
                    </span>{" "}
                    / {availableTotal.toFixed(1)}
                  </td>
                )
              })}
              <td className="px-2 py-3 text-center">
                {weeklyTotal.toFixed(1)} /{" "}
                {DAYS_OF_WEEK_ORDER.reduce(
                  (sum, day) => sum + (dailyAvailableUnits[day] ?? 0),
                  0,
                ).toFixed(1)}
              </td>
            </tr>
            <tr className="text-xs text-muted-foreground">
              <th scope="row" className="px-2 py-2">
                確保可能との差分
              </th>
              {DAYS_OF_WEEK_ORDER.map((day) => {
                const remaining = (dailyAvailableUnits[day] ?? 0) - totalsByDay[day]
                return (
                  <td
                    key={day}
                    className={cn(
                      "px-2 py-2 text-center",
                      remaining < 0 ? "font-semibold text-rose-700" : "",
                    )}
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
    </div>
  )
}
