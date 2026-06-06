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
  readonly wizardTitle: Locator
  readonly saveButton: Locator

  constructor(page: Page) {
    this.page = page

    // ウィザード全体
    this.wizard = page.getByRole("region", { name: "目標設定ウィザード" })

    // ヘッダー
    this.wizardTitle = page.getByRole("heading", { level: 2 }).first()
    this.saveButton = page.getByRole("button", { name: "保存" })
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

  async selectUnitDuration(label: string) {
    await this.page.getByRole("button", { name: new RegExp(label) }).click()
  }

  async goNext() {
    await this.page.getByRole("button", { name: /次へ/ }).click()
  }

  async increaseAvailableUnits(dayLabel: string, times: number) {
    const button = this.page.getByRole("button", {
      name: `${dayLabel}曜日の確保可能ユニットを増やす`,
    })
    for (let index = 0; index < times; index++) {
      await button.click()
    }
  }

  async addNewTask(taskName: string) {
    await this.page.getByPlaceholder("例: ストレッチ").fill(taskName)
    await this.page.getByRole("button", { name: "追加する" }).click()
  }

  async toggleTask(taskName: string) {
    await this.page
      .getByRole("button", { name: new RegExp(taskName) })
      .first()
      .click()
  }

  async fillTarget(taskName: string, dayLabel: string, units: string) {
    // デスクトップ表・モバイルカード双方の input に同一 aria-label を付与済み。
    // 表示中(visible)の input のみ操作する(片方は display:none でアクセシビリティツリー外)。
    const input = this.page
      .getByRole("spinbutton", { name: `${taskName}の${dayLabel}曜日の目標ユニット` })
      .filter({ visible: true })
      .first()
    await input.fill(units)
  }

  async save() {
    await this.saveButton.click()
  }
}
