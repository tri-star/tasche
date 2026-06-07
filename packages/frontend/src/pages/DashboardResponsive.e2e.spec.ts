import { expect, test } from "@/e2e/fixtures/auth"
import { expectNoDocumentHorizontalOverflow } from "@/e2e/helpers/responsive"
import { DashboardPage } from "@/e2e/pages/dashboard.page"

async function waitForDashboardReady(page: import("@playwright/test").Page) {
  const main = page.getByRole("main")
  await expect(main.getByText(/今日の目標|今週はまだ予定がありません/).first()).toBeVisible()
}

async function expectFabAvoidsMobileNav(page: import("@playwright/test").Page) {
  const boxes = await page.evaluate(() => {
    const fab = document.querySelector('button[aria-label="目標設定"]')
    const nav = document.querySelector('nav[aria-label="アプリナビゲーション"]')
    if (!fab || !nav) {
      throw new Error("FAB or nav not found")
    }

    const fabBox = fab.getBoundingClientRect()
    const navBox = nav.getBoundingClientRect()
    return {
      fabBottom: fabBox.bottom,
      navTop: navBox.top,
    }
  })

  expect(boxes.fabBottom).toBeLessThanOrEqual(boxes.navTop)
}

test.describe("Dashboard responsive layout (375px)", () => {
  test.setTimeout(30_000)

  test("ダッシュボード本文がドキュメント全体を横に押し広げない", async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 812 })
    await authenticatedPage.goto("/")
    await waitForDashboardReady(authenticatedPage)

    await expectNoDocumentHorizontalOverflow(authenticatedPage)
  })

  test("週間達成状況が375pxでviewportをはみ出さずカード形式で表示される", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 812 })
    await authenticatedPage.goto("/")
    await waitForDashboardReady(authenticatedPage)

    const dashboard = new DashboardPage(authenticatedPage)

    const section = authenticatedPage.locator('[aria-label="週間達成状況"]')
    await expect(section).toBeVisible()

    const fitsViewport = await authenticatedPage.evaluate(() => {
      const el = document.querySelector('[aria-label="週間達成状況"]')
      return el != null && el.getBoundingClientRect().right <= window.innerWidth
    })
    expect(fitsViewport).toBe(true)

    const mobileLayout = dashboard.weeklyMatrix.locator('[data-testid="weekly-matrix-mobile"]')
    await expect(mobileLayout.getByText("合計")).toBeVisible()
  })

  test("768px以上で週間達成状況テーブルが表示される", async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
    await authenticatedPage.goto("/")
    await waitForDashboardReady(authenticatedPage)

    const scrollContainer = authenticatedPage.locator('[data-testid="weekly-matrix-scroll"]')
    await expect(scrollContainer).toBeVisible()
  })

  test("目標未設定時、空状態とFABが本文を隠さない (MSW限定)", async ({ authenticatedPage }) => {
    test.skip(process.env.E2E_USE_MSW !== "true", "MSWモックデータ専用のテスト")

    await authenticatedPage.setViewportSize({ width: 375, height: 812 })

    await authenticatedPage.route("**/api/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            current_date: "2026-06-01",
            current_day_of_week: "monday",
            week: {
              id: "wk_test",
              start_date: "2026-05-26",
              end_date: "2026-06-01",
              unit_duration_minutes: 30,
            },
            today_goals: [],
            weekly_matrix: [],
            has_goals_configured: false,
          },
        }),
      })
    })

    await authenticatedPage.goto("/")
    await waitForDashboardReady(authenticatedPage)

    await expect(
      authenticatedPage.getByRole("main").getByText("今週はまだ予定がありません"),
    ).toBeVisible()

    await expect(authenticatedPage.getByRole("button", { name: "目標を設定する" })).toBeVisible()

    await expectFabAvoidsMobileNav(authenticatedPage)
    await expectNoDocumentHorizontalOverflow(authenticatedPage)
  })

  test("375pxで実績記録の主要操作ができる（スモーク）", async ({ authenticatedPage }) => {
    test.skip(process.env.E2E_USE_MSW !== "true", "MSWモックデータ専用のテスト")

    await authenticatedPage.setViewportSize({ width: 375, height: 812 })

    await authenticatedPage.route("**/api/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            current_date: "2026-06-02",
            current_day_of_week: "monday",
            week: {
              id: "wk_test2",
              start_date: "2026-06-02",
              end_date: "2026-06-08",
              unit_duration_minutes: 30,
            },
            today_goals: [
              {
                task_id: "tsk_01HXYZ1234567890ABCDEF",
                task_name: "英語学習",
                target_units: 2,
                actual_units: 0,
                completion_rate: 0,
              },
            ],
            weekly_matrix: [
              {
                task_id: "tsk_01HXYZ1234567890ABCDEF",
                task_name: "英語学習",
                daily_data: {
                  monday: { target_units: 2, actual_units: 0, completion_rate: 0 },
                  tuesday: null,
                  wednesday: null,
                  thursday: null,
                  friday: null,
                  saturday: null,
                  sunday: null,
                },
              },
            ],
            has_goals_configured: true,
          },
        }),
      })
    })

    await authenticatedPage.goto("/")
    await waitForDashboardReady(authenticatedPage)

    const recordWidget = authenticatedPage.getByRole("region", { name: "実績を記録" })

    const tuesdayButton = authenticatedPage.getByRole("radio", { name: /曜日 火/ })
    await tuesdayButton.scrollIntoViewIfNeeded()
    await tuesdayButton.click()
    await expect(tuesdayButton).toHaveAttribute("data-state", "on")

    const taskCombobox = recordWidget.getByRole("button", { name: "タスクを選択..." })
    await taskCombobox.scrollIntoViewIfNeeded()
    await taskCombobox.click()

    const option = authenticatedPage.getByRole("option", { name: "英語学習" })
    await expect(option).toBeVisible()
    await option.click()

    const increaseButton = recordWidget.getByRole("button", { name: "実績ユニットを増やす" })
    await increaseButton.scrollIntoViewIfNeeded()
    await increaseButton.click()

    const recordButton = recordWidget.getByRole("button", { name: "記録する" })
    await recordButton.scrollIntoViewIfNeeded()
    await expect(recordButton).toBeEnabled()

    await expectNoDocumentHorizontalOverflow(authenticatedPage)
  })
})
