import type { DailyAvailableUnits, DayOfWeek } from "@/api/generated/model"
import { SpinButton } from "@/components/common/SpinButton"
import { buildWeekDates, DAY_LABELS, DAYS_OF_WEEK_ORDER, formatMonthDay } from "@/lib/week-dates"

type AvailableUnitsGridProps = {
  availableUnits: DailyAvailableUnits
  weekStartDate: string
  onChange: (day: DayOfWeek, value: number) => void
}

export function AvailableUnitsGrid({
  availableUnits,
  weekStartDate,
  onChange,
}: AvailableUnitsGridProps) {
  const weekDates = buildWeekDates(weekStartDate)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {DAYS_OF_WEEK_ORDER.map((day) => {
        const date = weekDates.get(day)
        return (
          <div
            key={day}
            className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/35 p-3"
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-base font-semibold text-emerald-900">{DAY_LABELS[day]}</p>
              {date ? (
                <p className="text-xs text-muted-foreground">{formatMonthDay(date)}</p>
              ) : null}
            </div>
            <SpinButton
              value={availableUnits[day] ?? 0}
              onChange={(value) => onChange(day, value)}
              min={0}
              step={0.5}
              ariaLabel={`${DAY_LABELS[day]}曜日の確保可能ユニット`}
              unitLabel="unit"
              className="justify-center"
            />
          </div>
        )
      })}
    </div>
  )
}
