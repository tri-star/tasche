import { expect, test } from "@/e2e/fixtures/auth"
import { DashboardPage } from "@/e2e/pages/dashboard.page"

test.describe("DashboardPage", () => {
  const useMsw = process.env.E2E_USE_MSW === "true"

  test.describe("スモークテスト", () => {
    test("ページが正常に表示される", async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage)
      await dashboardPage.goto()
      await dashboardPage.waitForLoaded()

      // ページタイトルが表示されていることを確認
      await expect(dashboardPage.todayGoalsTitle).toBeVisible()
    })

    test("今日の目標ウィジェットが表示される", async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage)
      await dashboardPage.goto()
      await dashboardPage.waitForLoaded()

      // 今日の目標ウィジェットが表示されていることを確認
      await expect(dashboardPage.todayGoalsWidget).toBeVisible()
      await expect(dashboardPage.todayGoalsList).toBeVisible()
    })

    test("記録ウィジェットが表示される", async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage)
      await dashboardPage.goto()
      await dashboardPage.waitForLoaded()

      // 記録ウィジェットが表示されていることを確認
      const isVisible = await dashboardPage.isRecordWidgetVisible()
      expect(isVisible).toBe(true)
    })

    test("ウィークリーマトリックスが表示される", async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage)
      await dashboardPage.goto()
      await dashboardPage.waitForLoaded()

      // ウィークリーマトリックスが表示されていることを確認
      const isVisible = await dashboardPage.isWeeklyMatrixVisible()
      expect(isVisible).toBe(true)
    })

    test("目標設定FABが表示される", async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage)
      await dashboardPage.goto()
      await dashboardPage.waitForLoaded()

      // 目標設定FABが表示されていることを確認
      await expect(dashboardPage.goalSettingFab).toBeVisible()
    })
  })

  test.describe("機能テスト", () => {
    test("今日の目標が3件表示される（MSWモックデータ）", async ({ authenticatedPage }) => {
      test.skip(!useMsw, "MSWモックデータ専用のテスト")
      const dashboardPage = new DashboardPage(authenticatedPage)
      await dashboardPage.goto()
      await dashboardPage.waitForLoaded()

      // MSWモックでは3件の目標が設定されている
      const count = await dashboardPage.getTodayGoalsCount()
      expect(count).toBe(3)
    })

    test("モックデータのタスク名が表示される", async ({ authenticatedPage }) => {
      test.skip(!useMsw, "MSWモックデータ専用のテスト")
      const dashboardPage = new DashboardPage(authenticatedPage)
      await dashboardPage.goto()
      await dashboardPage.waitForLoaded()

      // MSWモックで設定されているタスク名を確認
      const hasTask1 = await dashboardPage.hasTodayGoal("試験勉強")
      const hasTask2 = await dashboardPage.hasTodayGoal("個人開発")
      const hasTask3 = await dashboardPage.hasTodayGoal("後で読む消化")

      expect(hasTask1).toBe(true)
      expect(hasTask2).toBe(true)
      expect(hasTask3).toBe(true)
    })

    test("目標設定FABをクリックすると目標設定ページに遷移する", async ({ authenticatedPage }) => {
      const dashboardPage = new DashboardPage(authenticatedPage)
      await dashboardPage.goto()
      await dashboardPage.waitForLoaded()

      // 目標設定FABをクリック
      await dashboardPage.clickGoalSettingFab()

      // URLが/goalsに変わることを確認
      await authenticatedPage.waitForURL("**/goals")
      expect(authenticatedPage.url()).toContain("/goals")
    })
  })
})
