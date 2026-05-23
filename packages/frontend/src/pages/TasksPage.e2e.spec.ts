import { expect, test } from "@/e2e/fixtures/auth"
import { TasksPage } from "@/e2e/pages/tasks.page"

test.describe("TasksPage", () => {
  test("初期一覧を表示する", async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage)

    await tasksPage.goto()
    await tasksPage.waitForLoaded()

    await expect(tasksPage.title).toBeVisible()
    await expect(tasksPage.addButton).toBeVisible()
    await expect(tasksPage.taskRow("試験勉強")).toBeVisible()
    await expect(authenticatedPage.getByText("個人開発")).toBeVisible()
  })

  test("主要 CRUD 導線が動作する", async ({ authenticatedPage }) => {
    const tasksPage = new TasksPage(authenticatedPage)
    const taskName = `E2EタスクCRUD-${Date.now()}`
    const updatedTaskName = `${taskName}-更新`

    await tasksPage.goto()
    await tasksPage.waitForLoaded()

    await tasksPage.createTask(taskName)
    await expect(tasksPage.taskRow(taskName)).toBeVisible()

    await tasksPage.editTask(taskName, updatedTaskName)
    await expect(tasksPage.taskRow(updatedTaskName)).toBeVisible()

    await tasksPage.deleteTask(updatedTaskName)
    await expect(tasksPage.taskRow(updatedTaskName)).toBeHidden()
  })
})
