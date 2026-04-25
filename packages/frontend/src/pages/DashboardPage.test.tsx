import { render, screen, waitFor } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DashboardPage } from "./DashboardPage"

const mockGetDashboard = vi.fn()
const mockCreateRecord = vi.fn()
const mockGetTasks = vi.fn()

vi.mock("@/api/generated/client", () => ({
  getDashboardApiDashboardGet: () => mockGetDashboard(),
  createRecordApiWeeksCurrentRecordsPost: (...args: unknown[]) => mockCreateRecord(...args),
  getTasksApiTasksGet: (...args: unknown[]) => mockGetTasks(...args),
}))

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
      data: { data: { tasks: [] } },
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

  it("サイドバーのナビゲーションが表示される", async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument()
    })

    expect(screen.getByText("ダッシュボード")).toBeInTheDocument()
    expect(screen.getByText("設定")).toBeInTheDocument()
    expect(screen.getByText("ヘルプ")).toBeInTheDocument()
  })
})
