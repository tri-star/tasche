import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GoalSettingPage } from "./GoalSettingPage"

describe("GoalSettingPage", () => {
  it("step1が表示される", async () => {
    render(<GoalSettingPage />)

    expect(await screen.findByText("1ユニットの時間を選んでください")).toBeInTheDocument()
  })

  it("ステップインジケーターが表示される", async () => {
    render(<GoalSettingPage />)

    expect(await screen.findByText("1. ユニット時間選択")).toBeInTheDocument()
    expect(screen.getByText("2. タスク選択")).toBeInTheDocument()
    expect(screen.getByText("3. 曜日別目標設定")).toBeInTheDocument()
    expect(screen.getByText("4. 確認")).toBeInTheDocument()
  })
})
