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
          has_current_goals: true,
          previous_goals: null,
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
          has_current_goals: true,
          previous_goals: null,
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
          has_current_goals: true,
          previous_goals: null,
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
          has_current_goals: true,
          previous_goals: null,
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

  it("当週が未設定で過去週の目標がある場合、ユニット時間・確保ユニット・タスク・目標値がデフォルトとして復元される", async () => {
    const user = userEvent.setup()
    mockGetTasks.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              id: "tsk_xxx",
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
          week_id: "wk_current",
          week_start_date: "2026-04-27",
          unit_duration_minutes: 30,
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
          has_current_goals: false,
          previous_goals: {
            week_id: "wk_prev",
            week_start_date: "2026-04-20",
            unit_duration_minutes: 60,
            daily_available_units: {
              monday: 1.5,
              tuesday: 1.0,
              wednesday: 0,
              thursday: 0,
              friday: 0,
              saturday: 0,
              sunday: 0,
            },
            goals: [
              {
                task_id: "tsk_xxx",
                task_name: "英語学習",
                daily_targets: {
                  monday: 2.0,
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
      },
      status: 200,
      headers: new Headers(),
    })

    render(
      <MemoryRouter>
        <GoalSettingPage />
      </MemoryRouter>,
    )

    // Step1: ユニット時間が1時間（60分）として pre-selected されていること（「次へ」が有効化されている）
    await screen.findByText("1ユニットの時間を選んでください")
    // 60分オプションが選択されているため「次へ」ボタンが有効化されているはず
    expect(screen.getByRole("button", { name: /次へ/ })).not.toBeDisabled()

    // 過去設定読み込みの注意文言が表示されること
    expect(
      screen.getByText(
        "直近の目標設定をデフォルト値として読み込みました。内容を確認して保存してください。",
      ),
    ).toBeInTheDocument()

    // Step2: 確保可能ユニットが復元されていること
    await user.click(screen.getByRole("button", { name: /次へ/ }))
    expect(screen.getByRole("spinbutton", { name: "月曜日の確保可能ユニット" })).toHaveValue(1.5)
    expect(screen.getByRole("spinbutton", { name: "火曜日の確保可能ユニット" })).toHaveValue(1)

    // Step3: 過去のタスク「英語学習」が選択済みであること
    await user.click(screen.getByRole("button", { name: /次へ/ }))
    // タスク名が表示され、チェックボックスがチェック済みであること
    expect(screen.getByText("英語学習")).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "英語学習" })).toBeChecked()
    // 選択済みタスクがあるため「次へ」が有効であること
    expect(screen.getByRole("button", { name: /次へ/ })).not.toBeDisabled()

    // Step4: 曜日別目標が復元されていること（月曜日目標2.0の入力値を確認）
    await user.click(screen.getByRole("button", { name: /次へ/ }))
    // 月曜日の目標値 2.0 が入力フィールドに設定されていること
    const inputs = screen.getAllByRole("spinbutton")
    // 最初の入力（月曜日）の値が 2 であること
    expect(inputs[0]).toHaveValue(2)
  })

  it("過去にも目標が無い場合（previous_goals: null）、フォームは初期状態（ユニット時間未選択）", async () => {
    mockGetCurrentGoals.mockResolvedValue({
      data: {
        data: {
          week_id: "wk_current",
          week_start_date: "2026-04-27",
          unit_duration_minutes: 30,
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
          has_current_goals: false,
          previous_goals: null,
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

    // ユニット時間が未選択のため「次へ」ボタンは無効であること
    expect(screen.getByRole("button", { name: /次へ/ })).toBeDisabled()

    // 注意文言は表示されないこと
    expect(
      screen.queryByText(
        "直近の目標設定をデフォルト値として読み込みました。内容を確認して保存してください。",
      ),
    ).not.toBeInTheDocument()
  })

  it("過去設定が全てアーカイブ済みタスクの場合も previous_goals: null となり、フォームは初期状態", async () => {
    // backend仕様上、アーカイブ済みタスクのみで構成された過去Goalはprevious_goals: nullとして返る
    // frontendはprevious_goals: nullの扱いを統一するため、「過去Goal無し」と同じ挙動になることを確認
    mockGetCurrentGoals.mockResolvedValue({
      data: {
        data: {
          week_id: "wk_current",
          week_start_date: "2026-04-27",
          unit_duration_minutes: 30,
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
          has_current_goals: false,
          previous_goals: null,
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

    // フォームは初期状態（ユニット時間未選択）のため「次へ」ボタンは無効であること
    expect(screen.getByRole("button", { name: /次へ/ })).toBeDisabled()
  })
})
