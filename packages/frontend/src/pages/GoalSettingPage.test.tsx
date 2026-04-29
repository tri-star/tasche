import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GoalSettingPage } from "./GoalSettingPage"

const mockGetTasks = vi.fn()
const mockGetCurrentGoals = vi.fn()

vi.mock("@/api/generated/client", () => ({
  getTasksApiTasksGet: () => mockGetTasks(),
  getCurrentGoalsApiWeeksCurrentGoalsGet: () => mockGetCurrentGoals(),
  updateTaskApiTasksTaskIdPut: vi.fn(),
  deleteTaskApiTasksTaskIdDelete: vi.fn(),
  updateCurrentGoalsApiWeeksCurrentGoalsPut: vi.fn(),
}))

describe("GoalSettingPage", () => {
  beforeEach(() => {
    mockGetTasks.mockResolvedValue({
      data: { data: { tasks: [] } },
      status: 200,
      headers: new Headers(),
    })
    mockGetCurrentGoals.mockResolvedValue({
      data: { data: { week_id: "week-1", unit_duration_minutes: 25, goals: [] } },
      status: 200,
      headers: new Headers(),
    })
  })

  it("step1が表示される", async () => {
    render(
      <MemoryRouter>
        <GoalSettingPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText("1ユニットの時間を選んでください")).toBeInTheDocument()
  })

  it("ステップインジケーターが表示される", async () => {
    render(
      <MemoryRouter>
        <GoalSettingPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText("ユニット時間選択")).toBeInTheDocument()
    expect(screen.getByText("タスク選択")).toBeInTheDocument()
    expect(screen.getByText("曜日別目標設定")).toBeInTheDocument()
    expect(screen.getByText("確認")).toBeInTheDocument()
  })
})
