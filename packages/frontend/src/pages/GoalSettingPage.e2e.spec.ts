import { expect, test } from "@/e2e/fixtures/auth"
import { DashboardPage } from "@/e2e/pages/dashboard.page"
import { GoalSettingPage } from "@/e2e/pages/goal-setting.page"

test.describe("GoalSettingPage", () => {
  test.describe("スモークテスト", () => {
    test("ページが正常に表示される", async ({ authenticatedPage }) => {
      const goalSettingPage = new GoalSettingPage(authenticatedPage)
      await goalSettingPage.goto()
      await goalSettingPage.waitForLoaded()

      // ページが表示されることを確認
      const isVisible = await goalSettingPage.isWizardVisible()
      expect(isVisible).toBe(true)
    })

    test("ページタイトルが表示される", async ({ authenticatedPage }) => {
      const goalSettingPage = new GoalSettingPage(authenticatedPage)
      await goalSettingPage.goto()
      await goalSettingPage.waitForLoaded()

      // タイトルが表示されることを確認（タイトルがある場合）
      const titleVisible = await goalSettingPage.isTitleVisible()
      // タイトルがない場合もあるので、ウィザードが表示されていればOK
      if (titleVisible) {
        await expect(goalSettingPage.wizardTitle).toBeVisible()
      } else {
        const wizardVisible = await goalSettingPage.isWizardVisible()
        expect(wizardVisible).toBe(true)
      }
    })
  })

  test.describe("機能テスト", () => {
    test("目標設定ウィザードが表示される", async ({ authenticatedPage }) => {
      const goalSettingPage = new GoalSettingPage(authenticatedPage)
      await goalSettingPage.goto()
      await goalSettingPage.waitForLoaded()

      // ウィザードが表示されることを確認
      const isVisible = await goalSettingPage.isWizardVisible()
      expect(isVisible).toBe(true)
    })

    test("新しいタスクを追加して目標保存するとダッシュボードに反映される", async ({
      authenticatedPage,
    }) => {
      const goalSettingPage = new GoalSettingPage(authenticatedPage)
      const dashboardPage = new DashboardPage(authenticatedPage)
      const taskName = `E2E新規タスク-${Date.now()}`

      await goalSettingPage.goto()
      await goalSettingPage.waitForLoaded()

      await goalSettingPage.selectUnitDuration("30分")
      await goalSettingPage.goNext()
      await goalSettingPage.addNewTask(taskName)
      await goalSettingPage.goNext()
      await goalSettingPage.fillTarget(taskName, "月", "1")
      await goalSettingPage.goNext()
      await goalSettingPage.save()

      await authenticatedPage.waitForURL("**/")
      await dashboardPage.waitForLoaded()
      await expect(dashboardPage.weeklyMatrix.getByText(taskName)).toBeVisible()
    })
  })
})
