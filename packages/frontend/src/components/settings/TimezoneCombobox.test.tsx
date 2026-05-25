import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TimezoneCombobox } from "./TimezoneCombobox"

vi.mock("@/lib/timezones", () => ({
  listSupportedTimezones: () => ["Asia/Tokyo", "UTC", "Europe/London"],
}))

describe("TimezoneCombobox", () => {
  it("初期 value が表示されること", () => {
    render(<TimezoneCombobox value="Asia/Tokyo" onChange={vi.fn()} />)
    expect(screen.getByRole("combobox")).toHaveTextContent("Asia/Tokyo")
  })

  it("value が空の場合、プレースホルダーが表示されること", () => {
    render(<TimezoneCombobox value="" onChange={vi.fn()} />)
    expect(screen.getByRole("combobox")).toHaveTextContent("タイムゾーンを選択")
  })

  it("クリックで Popover が開き、タイムゾーン一覧が表示されること", async () => {
    const user = userEvent.setup()
    render(<TimezoneCombobox value="Asia/Tokyo" onChange={vi.fn()} />)

    await user.click(screen.getByRole("combobox"))

    expect(screen.getByText("UTC")).toBeInTheDocument()
    expect(screen.getByText("Europe/London")).toBeInTheDocument()
  })

  it("項目を選ぶと onChange が選んだ値で呼ばれること", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<TimezoneCombobox value="Asia/Tokyo" onChange={handleChange} />)

    await user.click(screen.getByRole("combobox"))
    await user.click(screen.getByText("UTC"))

    expect(handleChange).toHaveBeenCalledWith("UTC")
  })

  it("項目を選ぶと Popover が閉じること", async () => {
    const user = userEvent.setup()
    render(<TimezoneCombobox value="Asia/Tokyo" onChange={vi.fn()} />)

    await user.click(screen.getByRole("combobox"))
    expect(screen.getByText("UTC")).toBeInTheDocument()

    await user.click(screen.getByText("UTC"))

    // Popover が閉じると cmdk のリストが非表示になる
    expect(screen.queryByText("Europe/London")).not.toBeInTheDocument()
  })

  it("disabled の場合、trigger ボタンが無効化されること", () => {
    render(<TimezoneCombobox value="Asia/Tokyo" onChange={vi.fn()} disabled />)
    expect(screen.getByRole("combobox")).toBeDisabled()
  })
})
