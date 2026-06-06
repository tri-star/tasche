import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { GoalTask } from "./types"
import { createEmptyTargets } from "./types"
import { WeeklyTargetGrid } from "./WeeklyTargetGrid"

const TASKS: GoalTask[] = [
  { id: "task-1", name: "英語学習" },
  { id: "task-2", name: "筋トレ" },
]

const defaultDailyAvailableUnits = {
  monday: 2,
  tuesday: 1,
  wednesday: 0,
  thursday: 0,
  friday: 0,
  saturday: 3,
  sunday: 3,
}

const defaultWeeklyTargets = {
  "task-1": { monday: 1, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 2, sunday: 0 },
  "task-2": { monday: 0, tuesday: 1, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
}

describe("WeeklyTargetGrid", () => {
  describe("レンダリング", () => {
    it("タスク名がモバイル・デスクトップ両レイアウトに表示される", () => {
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={TASKS}
          weeklyTargets={defaultWeeklyTargets}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set()}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      // タスク名が2つ表示される(モバイルカード + デスクトップテーブル)
      expect(screen.getAllByText("英語学習").length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText("筋トレ").length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("入力値の反映", () => {
    it("weeklyTargets の値が aria-label 付き input に反映される", () => {
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={TASKS}
          weeklyTargets={defaultWeeklyTargets}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set()}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      // 英語学習の月曜日: 1 (モバイル + デスクトップで2件)
      const englishMonday = screen.getAllByRole("spinbutton", {
        name: "英語学習の月曜日の目標ユニット",
      })
      expect(englishMonday.length).toBeGreaterThanOrEqual(2)
      for (const input of englishMonday) {
        expect(input).toHaveValue(1)
      }

      // 英語学習の土曜日: 2 (モバイル + デスクトップで2件)
      const englishSaturday = screen.getAllByRole("spinbutton", {
        name: "英語学習の土曜日の目標ユニット",
      })
      expect(englishSaturday.length).toBeGreaterThanOrEqual(2)
      for (const input of englishSaturday) {
        expect(input).toHaveValue(2)
      }
    })

    it("weeklyTargets に存在しないタスクの input は 0 になる", () => {
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={TASKS}
          weeklyTargets={{}}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set()}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      const mondayInputs = screen.getAllByRole("spinbutton", {
        name: "英語学習の月曜日の目標ユニット",
      })
      for (const input of mondayInputs) {
        expect(input).toHaveValue(0)
      }
    })
  })

  describe("onChange ハンドラー", () => {
    it("input 変更で onUpdateTargets が正しい taskId・day・値で呼ばれる", async () => {
      const user = userEvent.setup()
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={TASKS}
          weeklyTargets={defaultWeeklyTargets}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set()}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      // モバイルカードの input を操作(最初の1件を取得)
      const englishTuesdayInputs = screen.getAllByRole("spinbutton", {
        name: "英語学習の火曜日の目標ユニット",
      })
      await user.clear(englishTuesdayInputs[0])
      await user.type(englishTuesdayInputs[0], "3")

      expect(onUpdateTargets).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({ tuesday: 3 }),
      )
    })

    it("weeklyTargets に存在しないタスクを変更すると createEmptyTargets をベースに更新される", async () => {
      const user = userEvent.setup()
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={TASKS}
          weeklyTargets={{}}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set()}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      const mondayInputs = screen.getAllByRole("spinbutton", {
        name: "英語学習の月曜日の目標ユニット",
      })
      await user.clear(mondayInputs[0])
      await user.type(mondayInputs[0], "2")

      expect(onUpdateTargets).toHaveBeenCalledWith(
        "task-1",
        expect.objectContaining({
          ...createEmptyTargets(),
          monday: 2,
        }),
      )
    })
  })

  describe("週間合計サマリー", () => {
    it("週間合計ユニットが正しい値で表示される", () => {
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={TASKS}
          weeklyTargets={defaultWeeklyTargets}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set()}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      // task-1: mon=1, sat=2 → 3
      // task-2: tue=1 → 1
      // 合計: 4.0
      expect(screen.getByText("週間合計ユニット")).toBeInTheDocument()
      // サマリーカード内の週間合計値(モバイルカードブロック内)を確認
      const mobileCards = screen.getByTestId("weekly-target-cards")
      expect(mobileCards.textContent).toContain("4.0")
    })

    it("weeklyTargets が空の場合は週間合計サマリーに 0.0 が表示される", () => {
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={TASKS}
          weeklyTargets={{}}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set()}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      // サマリーカード内の週間合計値(モバイルカードブロック内)を確認
      const mobileCards = screen.getByTestId("weekly-target-cards")
      expect(mobileCards.textContent).toContain("0.0")
    })
  })

  describe("exceededDays ハイライト", () => {
    it("exceededDays の曜日の input に rose クラスが付く(モバイルカード)", () => {
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={[TASKS[0]]}
          weeklyTargets={defaultWeeklyTargets}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set(["monday"])}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      const mondayInputs = screen.getAllByRole("spinbutton", {
        name: "英語学習の月曜日の目標ユニット",
      })
      // 少なくとも1件が rose クラスを持つ
      const hasRoseClass = mondayInputs.some(
        (input) =>
          input.className.includes("border-rose-300") || input.className.includes("bg-rose-50"),
      )
      expect(hasRoseClass).toBe(true)
    })

    it("超過していない曜日には rose クラスが付かない", () => {
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={[TASKS[0]]}
          weeklyTargets={defaultWeeklyTargets}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set(["monday"])}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      const tuesdayInputs = screen.getAllByRole("spinbutton", {
        name: "英語学習の火曜日の目標ユニット",
      })
      for (const input of tuesdayInputs) {
        expect(input.className).not.toContain("border-rose-300")
        expect(input.className).not.toContain("bg-rose-50")
      }
    })
  })

  describe("確保可能ユニットハイライト", () => {
    it("確保可能ユニット > 0 の曜日の input(モバイルカード)に emerald クラスが付く", () => {
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={[TASKS[0]]}
          weeklyTargets={defaultWeeklyTargets}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set()}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      // モバイルカードの月曜日 input: dailyAvailableUnits.monday = 2 > 0
      const mondayInputs = screen.getAllByRole("spinbutton", {
        name: "英語学習の月曜日の目標ユニット",
      })
      // モバイルカード(最初の要素)に emerald ハイライトクラスがあること
      const hasEmeraldClass = mondayInputs.some(
        (input) =>
          input.className.includes("border-emerald-200") ||
          input.className.includes("bg-emerald-50"),
      )
      expect(hasEmeraldClass).toBe(true)
    })
  })

  describe("aria-label", () => {
    it("全 input に適切な aria-label が付与される", () => {
      const onUpdateTargets = vi.fn()
      render(
        <WeeklyTargetGrid
          tasks={[TASKS[0]]}
          weeklyTargets={defaultWeeklyTargets}
          dailyAvailableUnits={defaultDailyAvailableUnits}
          exceededDays={new Set()}
          onUpdateTargets={onUpdateTargets}
        />,
      )

      const days = [
        { day: "月曜日" },
        { day: "火曜日" },
        { day: "水曜日" },
        { day: "木曜日" },
        { day: "金曜日" },
        { day: "土曜日" },
        { day: "日曜日" },
      ]

      for (const { day } of days) {
        // モバイル + デスクトップで各2件ずつ存在する
        const inputs = screen.getAllByRole("spinbutton", {
          name: `英語学習の${day}の目標ユニット`,
        })
        expect(inputs.length).toBeGreaterThanOrEqual(2)
      }
    })
  })
})
