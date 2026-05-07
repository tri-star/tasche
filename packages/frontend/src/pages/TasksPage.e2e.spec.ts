import { expect, test } from "@/e2e/fixtures/auth"
import { TasksPage } from "@/e2e/pages/tasks.page"

test.describe("TasksPage", () => {
  test("初期一覧を表示する", async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage)

    await tasksPage.goto()
    await tasksPage.waitForLoaded()

    await expect(tasksPage.title).toBeVisible()
    await expect(tasksPage.addButton).toBeVisible()
    await expect(authenticatedPage.getByText("英語学習")).toBeVisible()
    await expect(authenticatedPage.getByText("個人開発")).toBeVisible()
  })

  test("主要 CRUD 導線が動作する", async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage)

    await tasksPage.goto()
    await tasksPage.waitForLoaded()

    await tasksPage.createTask("朝の散歩")
    await expect(authenticatedPage.getByText("朝の散歩")).toBeVisible()

    await tasksPage.editTask("英語学習", "英語学習 改")
    await expect(authenticatedPage.getByText("英語学習 改")).toBeVisible()

    await tasksPage.deleteTask("筋トレ")
    await expect(authenticatedPage.getByText("筋トレ")).toBeHidden()
  })
})
