import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { NoGoalsEmptyState } from "./NoGoalsEmptyState"

describe("NoGoalsEmptyState", () => {
  it("見出しテキスト「今週はまだ予定がありません」が表示される", () => {
    render(<NoGoalsEmptyState onClickGoalSetting={vi.fn()} />)

    expect(screen.getByText("今週はまだ予定がありません")).toBeInTheDocument()
  })

  it("ボタン「目標を設定する」が表示される", () => {
    render(<NoGoalsEmptyState onClickGoalSetting={vi.fn()} />)

    expect(screen.getByRole("button", { name: "目標を設定する" })).toBeInTheDocument()
  })

  it("ボタンをクリックすると onClickGoalSetting が呼ばれる", async () => {
    const user = userEvent.setup()
    const onClickGoalSetting = vi.fn()

    render(<NoGoalsEmptyState onClickGoalSetting={onClickGoalSetting} />)

    await user.click(screen.getByRole("button", { name: "目標を設定する" }))

    expect(onClickGoalSetting).toHaveBeenCalledOnce()
  })
})
