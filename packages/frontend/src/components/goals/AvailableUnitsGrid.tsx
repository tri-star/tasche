import { Minus, Plus } from "lucide-react"
import type { DailyAvailableUnits, DayOfWeek } from "@/api/generated/model"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildWeekDates, DAY_LABELS, DAYS_OF_WEEK_ORDER, formatMonthDay } from "@/lib/week-dates"

type AvailableUnitsGridProps = {
  availableUnits: DailyAvailableUnits
  weekStartDate: string
  onChange: (day: DayOfWeek, value: number) => void
}

function normalizeUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Number(value.toFixed(1)))
}

export function AvailableUnitsGrid({
  availableUnits,
  weekStartDate,
  onChange,
}: AvailableUnitsGridProps) {
  const weekDates = buildWeekDates(weekStartDate)

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {DAYS_OF_WEEK_ORDER.map((day) => {
        const date = weekDates.get(day)
        const value = normalizeUnit(availableUnits[day] ?? 0)
        const label = `${DAY_LABELS[day]}曜日の確保可能ユニット`
        return (
          <div
            key={day}
            className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/35 p-2.5"
          >
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <label
                htmlFor={`available-units-${day}`}
                className="text-sm font-semibold text-emerald-900"
              >
                {DAY_LABELS[day]}
              </label>
              {date ? (
                <p className="text-xs text-muted-foreground">{formatMonthDay(date)}</p>
              ) : null}
            </div>
            <div className="flex min-w-0 items-center justify-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onChange(day, normalizeUnit(value - 0.5))}
                disabled={value <= 0}
                className="h-7 w-7 shrink-0 rounded-md"
                aria-label={`${label}を減らす`}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <input
                id={`available-units-${day}`}
                type="number"
                min={0}
                step={0.5}
                value={value}
                onChange={(event) => onChange(day, normalizeUnit(Number(event.target.value)))}
                aria-label={label}
                className={cn(
                  "h-7 w-12 shrink-0 rounded-md border border-emerald-100 bg-white px-1 text-center",
                  "text-sm font-semibold text-emerald-950 focus:border-emerald-300 focus:outline-none",
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onChange(day, normalizeUnit(value + 0.5))}
                className="h-7 w-7 shrink-0 rounded-md"
                aria-label={`${label}を増やす`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
