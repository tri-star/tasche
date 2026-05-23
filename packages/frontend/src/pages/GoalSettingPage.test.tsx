import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GoalSettingPage } from "./GoalSettingPage"

const mockGetTasks = vi.fn()
const mockGetCurrentGoals = vi.fn()
const mockUpdateCurrentGoals = vi.fn()

vi.mock("@/api/generated/client", () => ({
  getTasksApiTasksGet: () => mockGetTasks(),
  getCurrentGoalsApiWeeksCurrentGoalsGet: () => mockGetCurrentGoals(),
  updateTaskApiTasksTaskIdPut: vi.fn(),
  deleteTaskApiTasksTaskIdDelete: vi.fn(),
  updateCurrentGoalsApiWeeksCurrentGoalsPut: (payload: unknown) => mockUpdateCurrentGoals(payload),
}))

describe("GoalSettingPage", () => {
  beforeEach(() => {
    mockGetTasks.mockResolvedValue({
      data: { data: { items: [], total: 0, page: 1, per_page: 20 } },
      status: 200,
      headers: new Headers(),
    })
    mockGetCurrentGoals.mockResolvedValue({
      data: {
        data: {
          week_id: "week-1",
          week_start_date: "2026-04-20",
          unit_duration_minutes: 25,
          daily_available_units: {
            monday: 0,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
            sunday: 0,
          },
          goals: [],
        },
      },
      status: 200,
      headers: new Headers(),
    })
    mockUpdateCurrentGoals.mockResolvedValue({
      data: { data: {} },
      status: 400,
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
    expect(screen.getByText("確保可能ユニット")).toBeInTheDocument()
    expect(screen.getByText("タスク選択")).toBeInTheDocument()
    expect(screen.getByText("曜日別目標設定")).toBeInTheDocument()
    expect(screen.getByText("確認")).toBeInTheDocument()
  })

  it("確保可能ユニットの初期値が復元される", async () => {
    const user = userEvent.setup()
    mockGetCurrentGoals.mockResolvedValue({
      data: {
        data: {
          week_id: "week-1",
          week_start_date: "2026-04-20",
          unit_duration_minutes: 30,
          daily_available_units: {
            monday: 1.5,
            tuesday: 2,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
            sunday: 0,
          },
          goals: [],
        },
      },
      status: 200,
      headers: new Headers(),
    })

    render(
      <MemoryRouter>
        <GoalSettingPage />
      </MemoryRouter>,
    )

    await screen.findByText("1ユニットの時間を選んでください")
    await user.click(screen.getByRole("button", { name: /次へ/ }))

    expect(screen.getByRole("spinbutton", { name: "月曜日の確保可能ユニット" })).toHaveValue(1.5)
    expect(screen.getByRole("spinbutton", { name: "火曜日の確保可能ユニット" })).toHaveValue(2)
  })

  it("保存payloadにdaily_available_unitsが含まれる", async () => {
    const user = userEvent.setup()
    mockGetTasks.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              id: "task-1",
              name: "英語学習",
              is_archived: false,
              consumed_units_last_week: 0,
              consumed_units_total: 0,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          per_page: 20,
        },
      },
      status: 200,
      headers: new Headers(),
    })
    mockGetCurrentGoals.mockResolvedValue({
      data: {
        data: {
          week_id: "week-1",
          week_start_date: "2026-04-20",
          unit_duration_minutes: 30,
          daily_available_units: {
            monday: 2,
            tuesday: 1,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
            sunday: 0,
          },
          goals: [
            {
              task_id: "task-1",
              task_name: "英語学習",
              daily_targets: {
                monday: 1,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
              },
            },
          ],
        },
      },
      status: 200,
      headers: new Headers(),
    })

    render(
      <MemoryRouter>
        <GoalSettingPage />
      </MemoryRouter>,
    )

    await screen.findByText("1ユニットの時間を選んでください")
    await user.click(screen.getByRole("button", { name: /次へ/ }))
    await user.click(screen.getByRole("button", { name: "火曜日の確保可能ユニットを増やす" }))
    await user.click(screen.getByRole("button", { name: /次へ/ }))
    await user.click(screen.getByRole("button", { name: /次へ/ }))
    await user.click(screen.getByRole("button", { name: /次へ/ }))
    await user.click(screen.getByRole("button", { name: "保存" }))

    expect(mockUpdateCurrentGoals).toHaveBeenCalledWith(
      expect.objectContaining({
        daily_available_units: expect.objectContaining({
          monday: 2,
          tuesday: 1.5,
        }),
      }),
    )
  })

  it("目標合計が確保可能ユニットを超えると次へ進めない", async () => {
    const user = userEvent.setup()
    mockGetTasks.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              id: "task-1",
              name: "英語学習",
              is_archived: false,
              consumed_units_last_week: 0,
              consumed_units_total: 0,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          per_page: 20,
        },
      },
      status: 200,
      headers: new Headers(),
    })
    mockGetCurrentGoals.mockResolvedValue({
      data: {
        data: {
          week_id: "week-1",
          week_start_date: "2026-04-20",
          unit_duration_minutes: 30,
          daily_available_units: {
            monday: 1,
            tuesday: 0,
            wednesday: 0,
            thursday: 0,
            friday: 0,
            saturday: 0,
            sunday: 0,
          },
          goals: [
            {
              task_id: "task-1",
              task_name: "英語学習",
              daily_targets: {
                monday: 2,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0,
              },
            },
          ],
        },
      },
      status: 200,
      headers: new Headers(),
    })

    render(
      <MemoryRouter>
        <GoalSettingPage />
      </MemoryRouter>,
    )

    await screen.findByText("1ユニットの時間を選んでください")
    await user.click(screen.getByRole("button", { name: /次へ/ }))
    await user.click(screen.getByRole("button", { name: /次へ/ }))
    await user.click(screen.getByRole("button", { name: /次へ/ }))

    expect(screen.getAllByText("2.0 / 1.0").length).toBeGreaterThan(0)
    expect(
      screen.getByText("月曜日の目標合計が、確保可能ユニットを超えています。"),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /次へ/ })).toBeDisabled()
  })
})
