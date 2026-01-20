import type { Locator, Page } from "@playwright/test"

/**
 * DashboardPageのページオブジェクト
 * E2Eテストで使用するページ要素とアクションを定義
 */
export class DashboardPage {
  readonly page: Page

  // セクション
  readonly todayGoalsWidget: Locator
  readonly recordWidget: Locator
  readonly weeklyMatrix: Locator
  readonly goalSettingFab: Locator

  // 今日の目標ウィジェット内の要素
  readonly todayGoalsTitle: Locator
  readonly todayGoalsList: Locator

  constructor(page: Page) {
    this.page = page

    // 各ウィジェットの要素
    this.todayGoalsWidget = page.getByRole("region").filter({ hasText: "今日の目標" })
    this.recordWidget = page.getByRole("region").filter({ hasText: "記録する" })
    this.weeklyMatrix = page.locator('[class*="weekly"]').first()
    this.goalSettingFab = page.getByRole("button", { name: /目標/ })

    // 今日の目標ウィジェット内の要素
    this.todayGoalsTitle = this.todayGoalsWidget.getByText("今日の目標")
    this.todayGoalsList = this.todayGoalsWidget.getByRole("list")
  }

  /**
   * ダッシュボードページに遷移
   */
  async goto() {
    await this.page.goto("/")
  }

  /**
   * ページが正常に表示されていることを確認
   */
  async waitForLoaded() {
    await this.todayGoalsTitle.waitFor({ state: "visible" })
  }

  /**
   * 今日の目標の数を取得
   */
  async getTodayGoalsCount(): Promise<number> {
    const items = await this.todayGoalsList.getByRole("listitem").all()
    return items.length
  }

  /**
   * 指定したタスク名が今日の目標に含まれているか確認
   */
  async hasTodayGoal(taskName: string): Promise<boolean> {
    const item = this.todayGoalsList.getByText(taskName)
    return await item.isVisible()
  }

  /**
   * 目標設定ボタンをクリックして目標設定ページへ遷移
   */
  async clickGoalSettingFab() {
    await this.goalSettingFab.click()
  }

  /**
   * ウィークリーマトリックスが表示されているか確認
   */
  async isWeeklyMatrixVisible(): Promise<boolean> {
    return await this.weeklyMatrix.isVisible()
  }

  /**
   * 記録ウィジェットが表示されているか確認
   */
  async isRecordWidgetVisible(): Promise<boolean> {
    return await this.recordWidget.isVisible()
  }
}
