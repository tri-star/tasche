import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { listSupportedTimezones } from "./timezones"

describe("listSupportedTimezones", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("先頭が Asia/Tokyo → UTC の順であること", () => {
    const timezones = listSupportedTimezones()
    expect(timezones[0]).toBe("Asia/Tokyo")
    expect(timezones[1]).toBe("UTC")
  })

  it("重複が除去されていること", () => {
    vi.spyOn(Intl, "supportedValuesOf").mockReturnValue([
      "Asia/Tokyo",
      "UTC",
      "Asia/Tokyo",
      "Europe/London",
    ] as unknown as ReturnType<typeof Intl.supportedValuesOf>)

    const timezones = listSupportedTimezones()
    const uniqueCount = new Set(timezones).size
    expect(uniqueCount).toBe(timezones.length)
  })

  it("Intl.supportedValuesOf がエラーを投げた場合にフォールバック一覧を返すこと", () => {
    vi.spyOn(Intl, "supportedValuesOf").mockImplementation(() => {
      throw new Error("not supported")
    })

    const timezones = listSupportedTimezones()
    expect(timezones).toContain("UTC")
    expect(timezones).toContain("Asia/Tokyo")
    expect(timezones).toContain("Europe/London")
    expect(timezones).toContain("America/New_York")
  })

  it("Intl.supportedValuesOf が空配列を返した場合にフォールバック一覧を返すこと", () => {
    vi.spyOn(Intl, "supportedValuesOf").mockReturnValue(
      [] as unknown as ReturnType<typeof Intl.supportedValuesOf>,
    )

    const timezones = listSupportedTimezones()
    expect(timezones.length).toBeGreaterThan(0)
    expect(timezones).toContain("Asia/Tokyo")
  })

  it("全要素が IANA 形式（'/' を含むか UTC 単体）であること", () => {
    vi.spyOn(Intl, "supportedValuesOf").mockImplementation(() => {
      throw new Error("not supported")
    })

    const timezones = listSupportedTimezones()
    for (const tz of timezones) {
      expect(tz === "UTC" || /\//.test(tz)).toBe(true)
    }
  })

  it("先頭2件以外がアルファベット順でソートされていること", () => {
    vi.spyOn(Intl, "supportedValuesOf").mockReturnValue([
      "Europe/Paris",
      "America/New_York",
      "Asia/Tokyo",
      "UTC",
      "Africa/Cairo",
    ] as unknown as ReturnType<typeof Intl.supportedValuesOf>)

    const timezones = listSupportedTimezones()
    const rest = timezones.slice(2)
    const sorted = [...rest].sort(new Intl.Collator("en").compare)
    expect(rest).toEqual(sorted)
  })
})
