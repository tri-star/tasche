const FALLBACK_TIMEZONES = [
  "UTC",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const

/**
 * Intl.supportedValuesOf("timeZone") を呼び出してタイムゾーン一覧を取得する。
 * 対応していない場合は FALLBACK_TIMEZONES にフォールバックする。
 */
function getRawTimezones(): string[] {
  try {
    const timezones = Intl.supportedValuesOf("timeZone")
    if (Array.isArray(timezones) && timezones.length > 0) {
      return timezones
    }
  } catch {
    // Intl.supportedValuesOf が未対応の環境ではフォールバック
  }
  return [...FALLBACK_TIMEZONES]
}

/**
 * サポートするタイムゾーンの一覧を返す。
 * Asia/Tokyo と UTC を先頭固定し、それ以降は英語アルファベット順でソートする。
 * 重複は除去する。
 */
export function listSupportedTimezones(): string[] {
  const raw = getRawTimezones()
  const unique = [...new Set(raw)]

  const pinned = ["Asia/Tokyo", "UTC"]
  const rest = unique.filter((tz) => !pinned.includes(tz)).sort(new Intl.Collator("en").compare)

  return [...pinned, ...rest]
}

/**
 * 後方互換用の定数エクスポート（フォールバック一覧の静的参照）
 */
export const SUPPORTED_TIMEZONES: readonly string[] = listSupportedTimezones()
