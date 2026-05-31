import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DashboardPage } from "./DashboardPage"

const mockGetDashboard = vi.fn()
const mockCreateRecord = vi.fn()
const mockGetTasks = vi.fn()
const mockNavigate = vi.fn()

vi.mock("@/api/generated/client", () => ({
  getDashboardApiDashboardGet: () => mockGetDashboard(),
  createRecordApiWeeksCurrentRecordsPost: (...args: unknown[]) => mockCreateRecord(...args),
  getTasksApiTasksGet: (...args: unknown[]) => mockGetTasks(...args),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockDashboardData = {
  current_date: "2026-04-24",
  current_day_of_week: "thursday",
  week: {
    id: "week-1",
    start_date: "2026-04-21",
    end_date: "2026-04-27",
    unit_duration_minutes: 25,
  },
  today_goals: [
    {
      task_id: "task-1",
      task_name: "試験勉強",
      target_units: 4,
      actual_units: 2,
      completion_rate: 50,
    },
  ],
  weekly_matrix: [
    {
      task_id: "task-1",
      task_name: "試験勉強",
      daily_data: {
        monday: { target_units: 4, actual_units: 3, completion_rate: 75 },
        tuesday: { target_units: 4, actual_units: 4, completion_rate: 100 },
        wednesday: { target_units: 4, actual_units: 2, completion_rate: 50 },
        thursday: { target_units: 4, actual_units: 2, completion_rate: 50 },
        friday: { target_units: 4, actual_units: 0, completion_rate: 0 },
        saturday: { target_units: 0, actual_units: 0, completion_rate: null },
        sunday: { target_units: 0, actual_units: 0, completion_rate: null },
      },
    },
  ],
  has_goals_configured: true,
}

function renderWithRouter() {
  const router = createMemoryRouter([{ path: "/", element: <DashboardPage /> }], {
    initialEntries: ["/"],
  })
  return render(<RouterProvider router={router} />)
}

describe("DashboardPage", () => {
  beforeEach(() => {
    mockGetDashboard.mockResolvedValue({
      data: { data: mockDashboardData },
      status: 200,
      headers: new Headers(),
    })
    mockCreateRecord.mockResolvedValue({ data: {}, status: 200, headers: new Headers() })
    mockGetTasks.mockResolvedValue({
      data: { data: { items: [], total: 0, page: 1, per_page: 20 } },
      status: 200,
      headers: new Headers(),
    })
  })

  it("ダッシュボードページが正常にレンダリングされる", async () => {
    renderWithRouter()

    expect(screen.getByText("読み込み中...")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument()
    })

    expect(screen.getByText("今日の目標")).toBeInTheDocument()
    expect(screen.getByText("実績を記録")).toBeInTheDocument()
    expect(screen.getByText("週間達成状況")).toBeInTheDocument()
    expect(screen.getAllByText("試験勉強").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: /目標設定/ })).toBeInTheDocument()
  })

  it("共通ナビゲーションが表示される", async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument()
    })

    for (const label of ["ダッシュボード", "タスク管理", "目標設定", "設定", "アカウント"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByRole("link", { name: "ヘルプ" })).not.toBeInTheDocument()
  })

  it("当週の目標が未設定のとき、空状態が表示される", async () => {
    mockGetDashboard.mockResolvedValue({
      data: {
        data: {
          ...mockDashboardData,
          has_goals_configured: false,
          today_goals: [],
          weekly_matrix: [],
        },
      },
      status: 200,
      headers: new Headers(),
    })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument()
    })

    expect(screen.getByText("今週はまだ予定がありません")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "目標を設定する" })).toBeInTheDocument()
    expect(screen.queryByText("今日の目標")).not.toBeInTheDocument()
    expect(screen.queryByText("実績を記録")).not.toBeInTheDocument()
    expect(screen.queryByText("週間達成状況")).not.toBeInTheDocument()
  })

  it("空状態のボタンクリックで /goals に遷移する", async () => {
    const user = userEvent.setup()
    mockGetDashboard.mockResolvedValue({
      data: {
        data: {
          ...mockDashboardData,
          has_goals_configured: false,
          today_goals: [],
          weekly_matrix: [],
        },
      },
      status: 200,
      headers: new Headers(),
    })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "目標を設定する" }))

    expect(mockNavigate).toHaveBeenCalledWith("/goals")
  })
})
