import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TasksPage } from "./TasksPage"

const mockGetTasks = vi.fn()
const mockCreateTask = vi.fn()
const mockUpdateTask = vi.fn()
const mockDeleteTask = vi.fn()
const mockBulkArchiveTasks = vi.fn()

vi.mock("@/api/generated/client", () => ({
  getTasksApiTasksGet: (...args: unknown[]) => mockGetTasks(...args),
  createTaskApiTasksPost: (...args: unknown[]) => mockCreateTask(...args),
  updateTaskApiTasksTaskIdPut: (...args: unknown[]) => mockUpdateTask(...args),
  deleteTaskApiTasksTaskIdDelete: (...args: unknown[]) => mockDeleteTask(...args),
  bulkArchiveTasksApiTasksDelete: (...args: unknown[]) => mockBulkArchiveTasks(...args),
}))

const initialTasks = [
  {
    id: "tsk_1",
    name: "英語学習",
    is_archived: false,
    consumed_units_last_week: 3,
    consumed_units_total: 10,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-02T00:00:00Z",
  },
  {
    id: "tsk_2",
    name: "筋トレ",
    is_archived: false,
    consumed_units_last_week: 1.5,
    consumed_units_total: 5,
    created_at: "2026-05-03T00:00:00Z",
    updated_at: "2026-05-04T00:00:00Z",
  },
]

function makeTasksResponse(tasks = initialTasks, total = initialTasks.length, page = 1) {
  return {
    data: {
      data: {
        items: tasks,
        total,
        page,
        per_page: 20,
      },
    },
    status: 200,
    headers: new Headers(),
  }
}

function renderWithRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const router = createMemoryRouter([{ path: "/tasks", element: <TasksPage /> }], {
    initialEntries: ["/tasks"],
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe("TasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTasks.mockResolvedValue(makeTasksResponse())
    mockCreateTask.mockResolvedValue({
      data: {
        data: {
          id: "tsk_3",
          name: "読書",
          is_archived: false,
          consumed_units_last_week: 0,
          consumed_units_total: 0,
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
          consumed_units_last_week: 3,
          consumed_units_total: 10,
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
          consumed_units_last_week: 1.5,
          consumed_units_total: 5,
          created_at: "2026-05-03T00:00:00Z",
          updated_at: "2026-05-06T00:00:00Z",
        },
      },
      status: 200,
      headers: new Headers(),
    })
    mockBulkArchiveTasks.mockResolvedValue({
      data: {
        data: {
          archived_ids: ["tsk_1", "tsk_2"],
          not_found_ids: [],
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
    expect(mockGetTasks).toHaveBeenCalledWith({
      include_archived: false,
      page: 1,
      per_page: 20,
    })
  })

  it("消化ユニット数(先週)・消化ユニット数(累計)がテーブルに Unit 形式で表示される", async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    // 英語学習: 先週3 Unit, 累計10 Unit
    const rows = screen.getAllByRole("row")
    const eigo = rows.find((r) => r.textContent?.includes("英語学習"))
    expect(eigo).toBeDefined()
    expect(eigo?.textContent).toContain("3 Unit")
    expect(eigo?.textContent).toContain("10 Unit")

    // 筋トレ: 先週1.5 Unit, 累計5 Unit
    const kintore = rows.find((r) => r.textContent?.includes("筋トレ"))
    expect(kintore).toBeDefined()
    expect(kintore?.textContent).toContain("1.5 Unit")
    expect(kintore?.textContent).toContain("5 Unit")
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
    mockGetTasks.mockResolvedValueOnce(makeTasksResponse([], 0))

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("まだタスクが登録されていません")).toBeInTheDocument()
    })
  })

  it("追加に失敗した場合はダイアログを開いたままエラーを表示する", async () => {
    const user = userEvent.setup()
    mockCreateTask.mockRejectedValueOnce(new Error("create failed"))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "タスクを追加" }))
    await user.type(screen.getByLabelText("タスク名"), "読書")
    await user.click(screen.getByRole("button", { name: "追加する" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("タスクの登録に失敗しました。")
    })
    expect(screen.getByRole("dialog", { name: "タスクを追加" })).toBeInTheDocument()
  })

  it("編集に失敗した場合はダイアログを開いたままエラーを表示する", async () => {
    const user = userEvent.setup()
    mockUpdateTask.mockRejectedValueOnce(new Error("update failed"))
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
      expect(screen.getByRole("alert")).toHaveTextContent("タスクの更新に失敗しました。")
    })
    expect(screen.getByRole("dialog", { name: "タスクを編集" })).toBeInTheDocument()
  })

  it("削除に失敗した場合はダイアログを開いたままエラーを表示する", async () => {
    const user = userEvent.setup()
    mockDeleteTask.mockRejectedValueOnce(new Error("delete failed"))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("筋トレ")).toBeInTheDocument()
    })

    const row = screen.getByRole("row", { name: /筋トレ/ })
    await user.click(within(row).getByRole("button", { name: "筋トレを削除" }))
    await user.click(screen.getByRole("button", { name: "削除する" }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "削除に失敗しました。時間をおいて再度お試しください。",
      )
    })
    expect(screen.getByRole("dialog", { name: "タスクを削除しますか？" })).toBeInTheDocument()
  })

  // ── バルク操作テスト ──────────────────────────────────────────────────

  it("ヘッダーの全選択チェックボックスをクリックすると全行が選択される", async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    const headerCheckbox = screen.getByRole("checkbox", { name: "表示中の全タスクを選択" })
    await user.click(headerCheckbox)

    const rowCheckboxes = screen.getAllByRole("checkbox", { name: /を選択$/ })
    for (const cb of rowCheckboxes) {
      expect(cb).toBeChecked()
    }
  })

  it("個別チェックボックスをクリックすると選択数テキストが増える", async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    const eigo = screen.getByRole("checkbox", { name: "英語学習を選択" })
    await user.click(eigo)

    expect(screen.getByText("1件選択中")).toBeInTheDocument()
  })

  it("バルク操作ドロップダウンは選択0件時に無効化されている", async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    const trigger = screen.getByRole("combobox")
    expect(trigger).toBeDisabled()
  })

  it("選択してバルク削除を選ぶと確認ダイアログが開き、削除するをクリックでAPIが呼ばれる", async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    // 全選択
    const headerCheckbox = screen.getByRole("checkbox", { name: "表示中の全タスクを選択" })
    await user.click(headerCheckbox)

    // バルク削除を選択
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)
    const deleteItem = await screen.findByRole("option", { name: "削除" })
    await user.click(deleteItem)

    // 確認ダイアログが開く
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /件のタスクを削除しますか？/ }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "削除する" }))

    await waitFor(() => {
      expect(mockBulkArchiveTasks).toHaveBeenCalledWith({
        ids: expect.arrayContaining(["tsk_1", "tsk_2"]),
      })
    })
  })

  it("バルク削除成功後、選択状態がリセットされる", async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    const eiGoCheckbox = screen.getByRole("checkbox", { name: "英語学習を選択" })
    await user.click(eiGoCheckbox)
    expect(screen.getByText("1件選択中")).toBeInTheDocument()

    // バルク削除実行
    const trigger = screen.getByRole("combobox")
    await user.click(trigger)
    const deleteItem = await screen.findByRole("option", { name: "削除" })
    await user.click(deleteItem)

    const confirmBtn = await screen.findByRole("button", { name: "削除する" })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(mockBulkArchiveTasks).toHaveBeenCalled()
    })

    // 成功後に選択がリセット → 「N件選択中」が消える
    await waitFor(() => {
      expect(screen.queryByText(/件選択中/)).not.toBeInTheDocument()
    })
  })

  it("ページネーションの次へをクリックするとpage=2でAPIが再フェッチされる", async () => {
    const user = userEvent.setup()
    // ページ1: 2件表示、合計25件
    mockGetTasks.mockResolvedValueOnce(makeTasksResponse(initialTasks, 25, 1))
    // ページ2用モック
    mockGetTasks.mockResolvedValueOnce(
      makeTasksResponse(
        [
          {
            id: "tsk_3",
            name: "読書",
            is_archived: false,
            consumed_units_last_week: 2,
            consumed_units_total: 8,
            created_at: "2026-05-05T00:00:00Z",
            updated_at: "2026-05-05T00:00:00Z",
          },
        ],
        25,
        2,
      ),
    )

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    const nextBtn = screen.getByRole("button", { name: "次のページに移動" })
    await user.click(nextBtn)

    await waitFor(() => {
      expect(mockGetTasks).toHaveBeenCalledWith({
        include_archived: false,
        page: 2,
        per_page: 20,
      })
    })
  })

  it("ページ切替時に選択状態がクリアされる", async () => {
    const user = userEvent.setup()
    mockGetTasks.mockResolvedValue(makeTasksResponse(initialTasks, 25, 1))

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("英語学習")).toBeInTheDocument()
    })

    const eiGoCheckbox = screen.getByRole("checkbox", { name: "英語学習を選択" })
    await user.click(eiGoCheckbox)
    expect(screen.getByText("1件選択中")).toBeInTheDocument()

    const nextBtn = screen.getByRole("button", { name: "次のページに移動" })
    await user.click(nextBtn)

    await waitFor(() => {
      expect(screen.queryByText(/件選択中/)).not.toBeInTheDocument()
    })
  })
})
