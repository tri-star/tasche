import type { Locator, Page } from "@playwright/test"

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export class TasksPage {
  readonly page: Page
  readonly title: Locator
  readonly addButton: Locator
  readonly reloadButton: Locator
  readonly taskNameInput: Locator

  constructor(page: Page) {
    this.page = page
    this.title = page.getByRole("heading", { name: "タスク一覧" })
    this.addButton = page.getByRole("button", { name: "タスクを追加" })
    this.reloadButton = page.getByRole("button", { name: "再読み込み" })
    this.taskNameInput = page.getByLabel("タスク名")
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

  taskRow(name: string) {
    return this.page.getByRole("row", { name: new RegExp(escapeRegExp(name)) })
  }

  async waitForTask(name: string) {
    await this.taskRow(name).waitFor({ state: "visible" })
  }

  async createTask(name: string) {
    await this.openCreateDialog()
    await this.taskNameInput.fill(name)
    await this.page.getByRole("button", { name: "追加する" }).click()
  }

  async editTask(currentName: string, nextName: string) {
    await this.taskRow(currentName)
      .getByRole("button", { name: `${currentName}を編集` })
      .click()
    await this.taskNameInput.fill(nextName)
    await this.page.getByRole("button", { name: "保存する" }).click()
  }

  async deleteTask(name: string) {
    await this.taskRow(name)
      .getByRole("button", { name: `${name}を削除` })
      .click()
    await this.page.getByRole("button", { name: "削除する" }).click()
  }
}
