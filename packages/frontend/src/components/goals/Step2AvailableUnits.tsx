import type { DailyAvailableUnits, DayOfWeek } from "@/api/generated/model"
import { Button } from "@/components/ui/button"
import { DAYS_OF_WEEK_ORDER } from "@/lib/week-dates"
import { AvailableUnitsGrid } from "./AvailableUnitsGrid"

type Step2AvailableUnitsProps = {
  availableUnits: DailyAvailableUnits
  unitDurationMinutes: number
  weekStartDate: string
  onChange: (day: DayOfWeek, value: number) => void
  onNext: () => void
  onBack: () => void
}

export function Step2AvailableUnits({
  availableUnits,
  unitDurationMinutes,
  weekStartDate,
  onChange,
  onNext,
  onBack,
}: Step2AvailableUnitsProps) {
  const totalUnits = DAYS_OF_WEEK_ORDER.reduce((sum, day) => sum + (availableUnits[day] ?? 0), 0)
  const totalHours = (totalUnits * unitDurationMinutes) / 60

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-emerald-900 sm:text-2xl">曜日ごとの確保可能ユニットを入力</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          今週それぞれの曜日で使える時間を、ユニット数で入力してください。
        </p>
      </div>

      <AvailableUnitsGrid
        availableUnits={availableUnits}
        weekStartDate={weekStartDate}
        onChange={onChange}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white/70 px-4 py-3">
        <p className="text-sm font-semibold text-emerald-900">今週確保できる合計</p>
        <p className="whitespace-nowrap text-base font-bold text-emerald-900">
          {totalUnits.toFixed(1)}ユニット / 約{totalHours.toFixed(1)}時間
        </p>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          ← 戻る
        </Button>
        <Button onClick={onNext}>次へ →</Button>
      </div>
    </div>
  )
}
