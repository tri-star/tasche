import type { Locator, Page } from "@playwright/test"

export class TasksPage {
  readonly page: Page
  readonly title: Locator
  readonly addButton: Locator
  readonly reloadButton: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByRole("heading", { name: "タスク一覧" })
    this.addButton = page.getByRole("button", { name: "タスクを追加" })
    this.reloadButton = page.getByRole("button", { name: "再読み込み" })
  }

  async goto() {
    await this.page.goto("/tasks")
  }

  async waitForLoaded() {
    await this.page.getByText("読み込み中...").waitFor({ state: "hidden" })
    await this.title.waitFor({ state: "visible" })
  }

  async openCreateDialog() {
    await this.addButton.click()
  }
}
