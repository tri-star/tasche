import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { DaySelector } from "./DaySelector"

describe("DaySelector", () => {
  it("7曜日ぶんのボタンが月曜始まりで表示される", () => {
    render(<DaySelector weekStartDate="2026-01-12" value="monday" onChange={vi.fn()} />)

    const buttons = screen.getAllByRole("radio")
    expect(buttons).toHaveLength(7)

    const labels = ["月", "火", "水", "木", "金", "土", "日"]
    for (const [index, label] of labels.entries()) {
      expect(buttons[index].textContent).toContain(label)
    }
  })

  it("各ボタンに該当日付が表示される", () => {
    render(<DaySelector weekStartDate="2026-01-12" value="monday" onChange={vi.fn()} />)

    const buttons = screen.getAllByRole("radio")
    // 月曜: 1/12
    expect(buttons[0].textContent).toContain("1/12")
    // 日曜: 1/18
    expect(buttons[6].textContent).toContain("1/18")
  })

  it('currentDay指定の曜日がaria-current="date"になる', () => {
    render(
      <DaySelector
        weekStartDate="2026-01-12"
        currentDay="wednesday"
        value="monday"
        onChange={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole("radio")
    // 水曜 (index 2) のみ aria-current="date"
    expect(buttons[2]).toHaveAttribute("aria-current", "date")

    // 他の曜日は aria-current を持たない
    for (const [index, button] of buttons.entries()) {
      if (index !== 2) {
        expect(button).not.toHaveAttribute("aria-current", "date")
      }
    }
  })

  it("valueに一致するボタンが選択状態になる", () => {
    render(<DaySelector weekStartDate="2026-01-12" value="thursday" onChange={vi.fn()} />)

    const buttons = screen.getAllByRole("radio")
    // 木曜 (index 3)
    expect(buttons[3]).toHaveAttribute("data-state", "on")

    // 他のボタンは選択されていない
    for (const [index, button] of buttons.entries()) {
      if (index !== 3) {
        expect(button).toHaveAttribute("data-state", "off")
      }
    }
  })

  it("ボタンクリックでonChangeが該当曜日で呼ばれる", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<DaySelector weekStartDate="2026-01-12" value="monday" onChange={onChange} />)

    const buttons = screen.getAllByRole("radio")
    // 火曜 (index 1)
    await user.click(buttons[1])

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("tuesday")
  })

  it("同じボタンを再クリックしてもonChangeが空値で呼ばれない", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<DaySelector weekStartDate="2026-01-12" value="monday" onChange={onChange} />)

    const buttons = screen.getAllByRole("radio")
    // 選択中の月曜 (index 0) を再クリック → 選択解除 → onChange は呼ばれない
    await user.click(buttons[0])

    expect(onChange).not.toHaveBeenCalled()
  })

  it("月をまたぐ週を正しく表示する", () => {
    render(<DaySelector weekStartDate="2026-01-26" value="monday" onChange={vi.fn()} />)

    const buttons = screen.getAllByRole("radio")
    // 月曜: 1/26
    expect(buttons[0].textContent).toContain("1/26")
    // 日曜: 2/1
    expect(buttons[6].textContent).toContain("2/1")
  })
})
