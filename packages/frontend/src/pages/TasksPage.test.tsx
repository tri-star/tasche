import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TasksPage } from "./TasksPage"

const mockGetTasks = vi.fn()
const mockCreateTask = vi.fn()
const mockUpdateTask = vi.fn()
const mockDeleteTask = vi.fn()

vi.mock("@/api/generated/client", () => ({
  getTasksApiTasksGet: (...args: unknown[]) => mockGetTasks(...args),
  createTaskApiTasksPost: (...args: unknown[]) => mockCreateTask(...args),
  updateTaskApiTasksTaskIdPut: (...args: unknown[]) => mockUpdateTask(...args),
  deleteTaskApiTasksTaskIdDelete: (...args: unknown[]) => mockDeleteTask(...args),
}))

const initialTasks = [
  {
    id: "tsk_1",
    name: "英語学習",
    is_archived: false,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-02T00:00:00Z",
  },
  {
    id: "tsk_2",
    name: "筋トレ",
    is_archived: false,
    created_at: "2026-05-03T00:00:00Z",
    updated_at: "2026-05-04T00:00:00Z",
  },
]

function renderWithRouter() {
  const router = createMemoryRouter([{ path: "/tasks", element: <TasksPage /> }], {
    initialEntries: ["/tasks"],
  })
  return render(<RouterProvider router={router} />)
}

describe("TasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTasks.mockResolvedValue({
      data: { data: { tasks: initialTasks } },
      status: 200,
      headers: new Headers(),
    })
    mockCreateTask.mockResolvedValue({
      data: {
        data: {
          id: "tsk_3",
          name: "読書",
          is_archived: false,
          created_at: "2026-05-05T00:00:00Z",
          updated_at: "2026-05-05T00:00:00Z",
        },
      },
      status: 201,
      headers: new Headers(),
    })
    mockUpdateTask.mockResolvedValue({
      data: {
        data: {
          id: "tsk_1",
          name: "英語の復習",
          is_archived: false,
          created_at: "2026-05-01T00:00:00Z",
          updated_at: "2026-05-06T00:00:00Z",
        },
      },
      status: 200,
      headers: new Headers(),
    })
    mockDeleteTask.mockResolvedValue({
      data: {
        data: {
          id: "tsk_2",
          name: "筋トレ",
          is_archived: true,
          created_at: "2026-05-03T00:00:00Z",
          updated_at: "2026-05-06T00:00:00Z",
        },
      },
      status: 200,
      headers: new Headers(),
    })
  })

  it("タスク一覧を表示する", async () => {
    renderWithRouter()

    expect(screen.getByText("読み込み中...")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument()
    })

    expect(screen.getByRole("heading", { name: "タスク一覧" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "タスクを追加" })).toBeInTheDocument()
    expect(screen.getByText("英語学習")).toBeInTheDocument()
    expect(screen.getByText("筋トレ")).toBeInTheDocument()
  })

  it("タスクを追加できる", async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "タスクを追加" }))
    await user.type(screen.getByLabelText("タスク名"), "読書")
    await user.click(screen.getByRole("button", { name: "追加する" }))

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith({ name: "読書" })
    })

    expect(screen.getByText("読書")).toBeInTheDocument()
  })

  it("タスクを編集できる", async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    const row = screen.getByRole("row", { name: /英語学習/ })
    await user.click(within(row).getByRole("button", { name: "英語学習を編集" }))
    const input = screen.getByLabelText("タスク名")
    await user.clear(input)
    await user.type(input, "英語の復習")
    await user.click(screen.getByRole("button", { name: "保存する" }))

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith("tsk_1", { name: "英語の復習" })
    })

    expect(screen.getByText("英語の復習")).toBeInTheDocument()
  })

  it("削除確認ダイアログからタスクを削除できる", async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("筋トレ")).toBeInTheDocument()
    })

    const row = screen.getByRole("row", { name: /筋トレ/ })
    await user.click(within(row).getByRole("button", { name: "筋トレを削除" }))

    expect(screen.getByRole("heading", { name: "タスクを削除しますか？" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "削除する" }))

    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith("tsk_2")
    })

    expect(screen.queryByText("筋トレ")).not.toBeInTheDocument()
  })

  it("取得失敗時に再読み込み導線を表示する", async () => {
    mockGetTasks.mockRejectedValueOnce(new Error("network error"))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("タスク一覧の取得に失敗しました。")).toBeInTheDocument()
    })

    expect(screen.getAllByRole("button", { name: "再読み込み" }).length).toBeGreaterThan(0)
  })

  it("タスクが空なら empty state を表示する", async () => {
    mockGetTasks.mockResolvedValueOnce({
      data: { data: { tasks: [] } },
      status: 200,
      headers: new Headers(),
    })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("まだタスクが登録されていません")).toBeInTheDocument()
    })
  })
})
