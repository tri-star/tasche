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
    this.wizard = page.getByRole("region", { name: "目標設定ウィザード" })

    // ヘッダー
    this.wizardHeader = page.locator("header, [role=banner]").first()
    this.wizardTitle = page.getByRole("heading", { level: 2 }).first()
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
    await this.page.getByText("読み込み中...").waitFor({ state: "hidden" })
    await this.wizard.waitFor({ state: "visible" })
  }

  /**
   * ページタイトルが表示されているか確認
   */
  async isTitleVisible(): Promise<boolean> {
    await this.wizardTitle.waitFor({ state: "visible" })
    const isVisible = await this.wizardTitle.isVisible()
    return isVisible
  }

  /**
   * ウィザードが表示されているか確認
   */
  async isWizardVisible(): Promise<boolean> {
    await this.wizard.waitFor({ state: "visible" })
    const isVisible = await this.wizard.isVisible()
    return isVisible
  }
}
