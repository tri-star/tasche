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

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const
const DAY_LABELS: Record<string, string> = {
  monday: "月",
  tuesday: "火",
  wednesday: "水",
  thursday: "木",
  friday: "金",
  saturday: "土",
  sunday: "日",
}

type WeeklyMatrixProps = {
  data: WeeklyMatrixItem[]
  currentDay: DayOfWeek
}

function getCompletionColorClass(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return ""
  if (rate === 0) return "bg-red-200"
  if (rate < 50) return "bg-red-100"
  if (rate < 80) return "bg-yellow-100"
  if (rate < 100) return "bg-yellow-50"
  return "bg-green-200"
}

function getSpriteOffset(rate: number | null | undefined): number {
  if (rate === null || rate === undefined) return 0
  if (rate < 50) return 0
  if (rate < 100) return 18
  return 36
}

export function WeeklyMatrix({ data, currentDay }: WeeklyMatrixProps) {
  const totals = DAYS_OF_WEEK.map((day) => {
    const dayData = data.map((item) => item.daily_data[day]).filter((d) => d !== undefined)

    if (dayData.length === 0) return null

    const totalTarget = dayData.reduce((sum, d) => sum + (d?.target_units ?? 0), 0)
    const totalActual = dayData.reduce((sum, d) => sum + (d?.actual_units ?? 0), 0)

    return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : null
  })

  return (
    <section className="rounded-lg border bg-card" aria-label="週間達成状況">
      <h3 className="px-4 py-3 text-lg font-semibold">週間達成状況</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32"></TableHead>
              {DAYS_OF_WEEK.map((day) => (
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
                <TableCell className="font-medium">{item.task_name}</TableCell>
                {DAYS_OF_WEEK.map((day) => {
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
                          <div
                            className="h-[18px] w-[18px] bg-no-repeat inline-block"
                            style={{
                              backgroundImage: "url(/images/dashboard/task-progress-sprites.png)",
                              backgroundPosition: `-${getSpriteOffset(rate)}px 0`,
                            }}
                          />
                          <span className="text-sm">{rate}%</span>
                        </div>
                      ) : null}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}

            <TableRow className="bg-muted/30 font-medium">
              <TableCell>合計</TableCell>
              {totals.map((total, index) => (
                <TableCell
                  key={DAYS_OF_WEEK[index]}
                  className={cn(
                    "text-center",
                    DAYS_OF_WEEK[index] === currentDay && "bg-primary/10",
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
