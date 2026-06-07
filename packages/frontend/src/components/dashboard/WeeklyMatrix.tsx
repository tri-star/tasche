import type { DayOfWeek, WeeklyMatrixItem } from "@/api/generated/model"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { DAY_LABELS, DAYS_OF_WEEK_ORDER } from "@/lib/week-dates"

type WeeklyMatrixProps = {
  data: WeeklyMatrixItem[]
  currentDay: DayOfWeek
}

function getCompletionColorClass(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return ""
  if (rate < 50) return "bg-destructive-soft"
  if (rate < 100) return "bg-warning-soft"
  return "bg-success-soft"
}

function getSpriteOffset(rate: number | null | undefined): number {
  if (rate === null || rate === undefined) return 0
  if (rate < 50) return 0
  if (rate < 100) return 18
  return 36
}

function ProgressSprite({ rate }: { rate: number | null | undefined }) {
  if (rate === null || rate === undefined) return null
  return (
    <div
      aria-hidden="true"
      className="inline-block h-[18px] w-[18px] shrink-0 bg-no-repeat"
      style={{
        backgroundImage: "url(/images/dashboard/task-progress-sprites.png)",
        backgroundPosition: `-${getSpriteOffset(rate)}px 0`,
      }}
    />
  )
}

export function WeeklyMatrix({ data, currentDay }: WeeklyMatrixProps) {
  const totals = DAYS_OF_WEEK_ORDER.map((day) => {
    const dayData = data.map((item) => item.daily_data[day]).filter((d) => d !== undefined)

    if (dayData.length === 0) return null

    const totalTarget = dayData.reduce((sum, d) => sum + (d?.target_units ?? 0), 0)
    const totalActual = dayData.reduce((sum, d) => sum + (d?.actual_units ?? 0), 0)

    return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : null
  })

  return (
    <section className="overflow-hidden rounded-lg border bg-card" aria-label="週間達成状況">
      <h3 className="px-4 py-3 text-lg font-semibold">週間達成状況</h3>

      {/* モバイルレイアウト (md未満): タスクをカード形式で縦積み */}
      <div className="block space-y-2 px-4 pb-4 md:hidden" data-testid="weekly-matrix-mobile">
        {data.map((item) => (
          <div key={item.task_id} className="rounded-md border bg-muted/10 p-3">
            <div className="mb-2 text-sm font-medium">{item.task_name}</div>
            <div className="grid grid-cols-2 gap-1">
              {DAYS_OF_WEEK_ORDER.map((day, idx) => {
                const dayData = item.daily_data[day]
                const rate = dayData?.completion_rate
                const isLast = idx === DAYS_OF_WEEK_ORDER.length - 1
                return (
                  <div
                    key={day}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-2 py-1",
                      isLast && "col-span-2",
                      day === currentDay && "bg-primary/10",
                      getCompletionColorClass(rate),
                    )}
                  >
                    <span className="w-4 shrink-0 text-xs text-muted-foreground">
                      {DAY_LABELS[day]}
                    </span>
                    {rate !== null && rate !== undefined ? (
                      <>
                        <ProgressSprite rate={rate} />
                        <span className="text-xs">{rate}%</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 text-sm font-medium">合計</div>
          <div className="grid grid-cols-2 gap-1">
            {totals.map((total, index) => {
              const day = DAYS_OF_WEEK_ORDER[index]
              const isLast = index === totals.length - 1
              return (
                <div
                  key={day}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2 py-1",
                    isLast && "col-span-2",
                    day === currentDay && "bg-primary/10",
                    getCompletionColorClass(total),
                  )}
                >
                  <span className="w-4 shrink-0 text-xs text-muted-foreground">
                    {DAY_LABELS[day]}
                  </span>
                  {total !== null ? (
                    <span className="text-xs">{total}%</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* デスクトップレイアウト (md以上): 横スクロール可能なテーブル */}
      <div className="hidden overflow-x-auto md:block" data-testid="weekly-matrix-scroll">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 w-32 bg-card"></TableHead>
              {DAYS_OF_WEEK_ORDER.map((day) => (
                <TableHead
                  key={day}
                  className={cn("text-center w-20", day === currentDay && "bg-primary/10")}
                >
                  {DAY_LABELS[day]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.task_id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium">
                  {item.task_name}
                </TableCell>
                {DAYS_OF_WEEK_ORDER.map((day) => {
                  const dayData = item.daily_data[day]
                  const rate = dayData?.completion_rate

                  return (
                    <TableCell
                      key={day}
                      className={cn(
                        "text-center p-2",
                        day === currentDay && "bg-primary/5",
                        getCompletionColorClass(rate),
                      )}
                    >
                      {rate !== null && rate !== undefined ? (
                        <div className="flex items-center justify-center gap-1">
                          <ProgressSprite rate={rate} />
                          <span className="text-sm">{rate}%</span>
                        </div>
                      ) : null}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}

            <TableRow className="bg-muted/30 font-medium">
              <TableCell className="sticky left-0 z-10 bg-muted/30">合計</TableCell>
              {totals.map((total, index) => (
                <TableCell
                  key={DAYS_OF_WEEK_ORDER[index]}
                  className={cn(
                    "text-center",
                    DAYS_OF_WEEK_ORDER[index] === currentDay && "bg-primary/10",
                  )}
                >
                  {total !== null ? `${total}%` : ""}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
