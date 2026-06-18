import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { RecordWidget } from "./RecordWidget"

const tasks = [
  { id: "task-1", name: "試験勉強" },
  { id: "task-2", name: "個人開発" },
]

describe("RecordWidget", () => {
  it("タスク選択ドロップダウンを開ける", async () => {
    const user = userEvent.setup()

    render(<RecordWidget currentDay="thursday" weekStartDate="2026-04-20" tasks={tasks} />)

    await user.click(screen.getByRole("button", { name: "タスクを選択..." }))

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getAllByRole("option")).toHaveLength(2)
  })

  it("SpinButtonで0.1刻みに変更した実績ユニット数を記録できる", async () => {
    const user = userEvent.setup()
    const onRecord = vi.fn()

    render(
      <RecordWidget
        currentDay="thursday"
        weekStartDate="2026-04-20"
        tasks={tasks}
        onRecord={onRecord}
      />,
    )

    await user.click(screen.getByRole("button", { name: "タスクを選択..." }))
    await user.click(screen.getByRole("option", { name: "試験勉強" }))
    await user.click(screen.getByRole("button", { name: "実績ユニットを増やす" }))
    await user.click(screen.getByRole("button", { name: "記録する" }))

    expect(onRecord).toHaveBeenCalledWith("thursday", "task-1", 1.6)
  })
})
