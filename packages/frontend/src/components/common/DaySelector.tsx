import { useMemo } from "react"
import type { DayOfWeek } from "@/api/generated/model"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { buildWeekDates, DAY_LABELS, DAYS_OF_WEEK_ORDER, formatMonthDay } from "@/lib/week-dates"

type DaySelectorProps = {
  /** 週の開始日 (YYYY-MM-DD、月曜の前提) */
  weekStartDate: string
  /** 今日の曜日。省略可。指定時は該当曜日に「今日」ハイライトを付与 */
  currentDay?: DayOfWeek
  /** 現在選択されている曜日 (制御コンポーネント) */
  value: DayOfWeek
  /** 曜日変更時のコールバック。空値(選択解除)を通知しない(= 常に1つ選択されている保証) */
  onChange: (day: DayOfWeek) => void
  /** 追加クラス */
  className?: string
  /** 各ボタンの aria-label の接頭辞 (任意、デフォルト「曜日」) */
  ariaLabelPrefix?: string
}

export function DaySelector({
  weekStartDate,
  currentDay,
  value,
  onChange,
  className,
  ariaLabelPrefix,
}: DaySelectorProps) {
  const dates = useMemo(() => buildWeekDates(weekStartDate), [weekStartDate])

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as DayOfWeek)
      }}
      className={cn("flex w-full justify-start gap-1 overflow-x-auto pb-1", className)}
      aria-label="曜日を選択"
    >
      {DAYS_OF_WEEK_ORDER.map((day) => {
        const date = dates.get(day)
        if (!date) return null
        const isToday = day === currentDay
        return (
          <ToggleGroupItem
            key={day}
            value={day}
            aria-current={isToday ? "date" : undefined}
            aria-label={`${ariaLabelPrefix ?? "曜日"} ${DAY_LABELS[day]} ${formatMonthDay(date)}`}
            className={cn(
              "flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl py-2",
              "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
              isToday && "ring-2 ring-primary/40",
            )}
          >
            <span className="text-sm font-medium leading-none">{DAY_LABELS[day]}</span>
            <span className="text-xs leading-none opacity-80">{formatMonthDay(date)}</span>
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
