import type { DayOfWeek } from "@/api/generated/model"

export const DAYS_OF_WEEK_ORDER: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

export const DAY_LABELS: Readonly<Record<DayOfWeek, string>> = {
  monday: "月",
  tuesday: "火",
  wednesday: "水",
  thursday: "木",
  friday: "金",
  saturday: "土",
  sunday: "日",
}

/**
 * 週の開始日 (YYYY-MM-DD) から、月曜〜日曜の7日分の日付 (Date オブジェクト) を返す。
 * タイムゾーンのズレ防止のため `T00:00:00` を付与してローカル時刻として解釈する。
 */
export function buildWeekDates(startDate: string): Map<DayOfWeek, Date> {
  const base = new Date(`${startDate}T00:00:00`)
  const result = new Map<DayOfWeek, Date>()

  for (let i = 0; i < DAYS_OF_WEEK_ORDER.length; i++) {
    const date = new Date(base)
    date.setDate(base.getDate() + i)
    result.set(DAYS_OF_WEEK_ORDER[i], date)
  }

  return result
}

/**
 * Date オブジェクトを "M/D" 形式の文字列に変換する (先頭ゼロなし)。
 */
export function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}
