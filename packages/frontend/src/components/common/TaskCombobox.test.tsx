import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TaskCombobox } from "./TaskCombobox"

const tasks = [
  { id: "tsk_1", name: "試験勉強" },
  { id: "tsk_2", name: "個人開発" },
  { id: "tsk_3", name: "読書" },
  { id: "tsk_4", name: "英語学習" },
]

describe("TaskCombobox", () => {
  it("未選択時にプレースホルダが表示される", () => {
    render(<TaskCombobox tasks={tasks} value="" onChange={vi.fn()} />)

    expect(screen.getByText("タスクを選択...")).toBeInTheDocument()
  })

  it("valueにマッチするタスク名がトリガーに表示される", () => {
    render(<TaskCombobox tasks={tasks} value="tsk_2" onChange={vi.fn()} />)

    expect(screen.getByText("個人開発")).toBeInTheDocument()
  })

  it("トリガークリックで候補リストが開き、全タスクがrole=optionとして表示される", async () => {
    const user = userEvent.setup()
    render(<TaskCombobox tasks={tasks} value="" onChange={vi.fn()} />)

    await user.click(screen.getByRole("button"))

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(4)
    expect(screen.getByText("試験勉強")).toBeInTheDocument()
    expect(screen.getByText("個人開発")).toBeInTheDocument()
    expect(screen.getByText("読書")).toBeInTheDocument()
    expect(screen.getByText("英語学習")).toBeInTheDocument()
  })

  it("フィルタ入力で候補が絞り込まれる（「個人」→「個人開発」のみ）", async () => {
    const user = userEvent.setup()
    render(<TaskCombobox tasks={tasks} value="" onChange={vi.fn()} />)

    await user.click(screen.getByRole("button"))
    await user.type(screen.getByRole("textbox", { name: "タスク検索" }), "個人")

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(1)
    expect(screen.getByText("個人開発")).toBeInTheDocument()
  })

  it("大文字小文字を問わない部分一致（英語タスクでの確認）", async () => {
    const user = userEvent.setup()
    const tasksWithEnglish = [
      { id: "tsk_1", name: "English Study" },
      { id: "tsk_2", name: "読書" },
    ]
    render(<TaskCombobox tasks={tasksWithEnglish} value="" onChange={vi.fn()} />)

    await user.click(screen.getByRole("button"))
    await user.type(screen.getByRole("textbox", { name: "タスク検索" }), "english")

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(1)
    expect(screen.getByText("English Study")).toBeInTheDocument()
  })

  it("候補クリックでonChangeが該当taskIdで呼ばれ、候補リストが閉じる", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TaskCombobox tasks={tasks} value="" onChange={onChange} />)

    await user.click(screen.getByRole("button"))
    await user.click(screen.getByText("個人開発"))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("tsk_2")
    expect(screen.queryByRole("option")).toBeNull()
  })

  it("ArrowDown/Upでactiveが移動、EnterでonChangeが呼ばれる", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TaskCombobox tasks={tasks} value="" onChange={onChange} />)

    await user.click(screen.getByRole("button"))
    const searchInput = screen.getByRole("textbox", { name: "タスク検索" })

    // searchInput にフォーカスを当ててからキー操作
    await user.click(searchInput)

    // 最初は index 0（試験勉強）がアクティブ
    // ArrowDown で index 1（個人開発）へ
    await user.keyboard("{ArrowDown}")
    // Enter で選択
    await user.keyboard("{Enter}")

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith("tsk_2")
  })

  it("Escapeキーでリストが閉じる", async () => {
    const user = userEvent.setup()
    render(<TaskCombobox tasks={tasks} value="" onChange={vi.fn()} />)

    await user.click(screen.getByRole("button"))
    expect(screen.getAllByRole("option")).toHaveLength(4)

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("option")).toBeNull()
  })

  it("該当なし時に「該当するタスクがありません」が表示される", async () => {
    const user = userEvent.setup()
    render(<TaskCombobox tasks={tasks} value="" onChange={vi.fn()} />)

    await user.click(screen.getByRole("button"))
    await user.type(screen.getByRole("textbox", { name: "タスク検索" }), "存在しないタスク")

    expect(screen.getByText("該当するタスクがありません")).toBeInTheDocument()
    expect(screen.queryByRole("option")).toBeNull()
  })

  it("disabled時はトリガークリックでリストが開かない", async () => {
    const user = userEvent.setup()
    render(<TaskCombobox tasks={tasks} value="" onChange={vi.fn()} disabled />)

    const trigger = screen.getByRole("button")
    expect(trigger).toBeDisabled()

    await user.click(trigger)
    expect(screen.queryByRole("option")).toBeNull()
  })
})
