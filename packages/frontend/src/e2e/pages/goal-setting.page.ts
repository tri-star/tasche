import type { Locator, Page } from "@playwright/test"

/**
 * GoalSettingPageのページオブジェクト
 * E2Eテストで使用するページ要素とアクションを定義
 */
export class GoalSettingPage {
  readonly page: Page

  // ウィザード全体
  readonly wizard: Locator

  // ヘッダー
  readonly wizardHeader: Locator
  readonly wizardTitle: Locator

  constructor(page: Page) {
    this.page = page

    // ウィザード全体
    this.wizard = page.locator('[class*="wizard"], [data-testid="goal-wizard"]').first()

    // ヘッダー
    this.wizardHeader = page.locator("header, [role=banner]").first()
    this.wizardTitle = page.getByRole("heading", { level: 1 }).first()
  }

  /**
   * 目標設定ページに遷移
   */
  async goto() {
    await this.page.goto("/goals")
  }

  /**
   * ページが正常に表示されていることを確認
   */
  async waitForLoaded() {
    // ページが読み込まれるまで待機
    await this.page.waitForLoadState("networkidle")
  }

  /**
   * ページタイトルが表示されているか確認
   */
  async isTitleVisible(): Promise<boolean> {
    return await this.wizardTitle.isVisible()
  }

  /**
   * ウィザードが表示されているか確認
   */
  async isWizardVisible(): Promise<boolean> {
    // いずれかの要素が表示されていればOK
    const titleVisible = await this.wizardTitle.isVisible().catch(() => false)
    const formVisible = await this.page
      .getByRole("form")
      .isVisible()
      .catch(() => false)
    return titleVisible || formVisible
  }
}
