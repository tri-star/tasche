import { expect, test } from "@/e2e/fixtures/auth"
import { TasksPage } from "@/e2e/pages/tasks.page"

test.describe("TasksPage", () => {
  test("ページが正常に表示される", async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage)

    await tasksPage.goto()
    await tasksPage.waitForLoaded()

    await expect(tasksPage.title).toBeVisible()
    await expect(tasksPage.addButton).toBeVisible()
  })

  test("追加ダイアログを開ける", async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage)

    await tasksPage.goto()
    await tasksPage.waitForLoaded()
    await tasksPage.openCreateDialog()

    await expect(authenticatedPage.getByRole("dialog", { name: "タスクを追加" })).toBeVisible()
    await expect(authenticatedPage.getByLabel("タスク名")).toBeVisible()
  })
})
