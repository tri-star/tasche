import { expect, test } from "@/e2e/fixtures/auth"
import { expectNoDocumentHorizontalOverflow } from "@/e2e/helpers/responsive"
import { GoalSettingPage } from "@/e2e/pages/goal-setting.page"

test.describe("GoalSetting responsive layout (375px)", () => {
  test.setTimeout(30_000)

  test("375pxでStep1から確認ステップ（保存直前）まで進められ、各ステップで横はみ出しがない", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 812 })

    const goalSettingPage = new GoalSettingPage(authenticatedPage)
    await goalSettingPage.goto()
    await goalSettingPage.waitForLoaded()

    // Step 1: ユニット時間選択
    await goalSettingPage.selectUnitDuration("30分")
    await expectNoDocumentHorizontalOverflow(authenticatedPage)
    await goalSettingPage.goNext()

    // Step 2: 確保可能ユニット
    await goalSettingPage.increaseAvailableUnits("月", 2)
    await expectNoDocumentHorizontalOverflow(authenticatedPage)
    await goalSettingPage.goNext()

    // Step 3: タスク選択
    const taskName = `E2E-375-${Date.now()}`
    await goalSettingPage.addNewTask(taskName)
    await expectNoDocumentHorizontalOverflow(authenticatedPage)
    await goalSettingPage.goNext()

    // Step 4: 曜日別目標設定
    await goalSettingPage.fillTarget(taskName, "月", "1")
    await expectNoDocumentHorizontalOverflow(authenticatedPage)
    await goalSettingPage.goNext()

    // Step 5: 確認（保存直前）
    await expectNoDocumentHorizontalOverflow(authenticatedPage)

    // 保存ボタンが表示され操作可能なことを確認（実際には保存しない）
    const saveButton = authenticatedPage.getByRole("button", { name: "保存" })
    await expect(saveButton).toBeVisible()
    await expect(saveButton).toBeEnabled()
  })

  test("375pxで戻る/次へ/保存ボタンが各ステップで表示され操作可能", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 812 })

    const goalSettingPage = new GoalSettingPage(authenticatedPage)
    await goalSettingPage.goto()
    await goalSettingPage.waitForLoaded()

    // Step 1: 次へボタンが表示される
    const nextButton = authenticatedPage.getByRole("button", { name: /次へ/ })
    await expect(nextButton).toBeVisible()

    await goalSettingPage.selectUnitDuration("30分")
    await goalSettingPage.goNext()

    // Step 2: 戻る/次へが表示される
    await expect(authenticatedPage.getByRole("button", { name: /← 戻る/ })).toBeVisible()
    await expect(authenticatedPage.getByRole("button", { name: /次へ/ })).toBeVisible()

    await goalSettingPage.increaseAvailableUnits("月", 2)
    await goalSettingPage.goNext()

    // Step 3: タスク追加後 次へが有効になる
    const taskName = `E2E-375-btn-${Date.now()}`
    await goalSettingPage.addNewTask(taskName)
    await expect(authenticatedPage.getByRole("button", { name: /次へ/ })).toBeEnabled()
    await goalSettingPage.goNext()

    // Step 4: 目標入力後 次へが有効になる
    await goalSettingPage.fillTarget(taskName, "月", "1")
    await expect(authenticatedPage.getByRole("button", { name: /次へ/ })).toBeEnabled()
    await goalSettingPage.goNext()

    // Step 5: 戻る/保存が表示される
    await expect(authenticatedPage.getByRole("button", { name: /← 戻る/ })).toBeVisible()
    await expect(authenticatedPage.getByRole("button", { name: "保存" })).toBeVisible()
    await expect(authenticatedPage.getByRole("button", { name: "保存" })).toBeEnabled()
  })

  test("375pxで曜日別目標テーブルがviewportをはみ出さない", async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 812 })

    const goalSettingPage = new GoalSettingPage(authenticatedPage)
    await goalSettingPage.goto()
    await goalSettingPage.waitForLoaded()

    await goalSettingPage.selectUnitDuration("30分")
    await goalSettingPage.goNext()
    await goalSettingPage.increaseAvailableUnits("月", 2)
    await goalSettingPage.goNext()

    const taskName = `E2E-375-grid-${Date.now()}`
    await goalSettingPage.addNewTask(taskName)
    await goalSettingPage.goNext()

    // WeeklyTargetGrid が viewport に収まっていることを確認
    const fitsViewport = await authenticatedPage.evaluate(() => {
      const el = document.querySelector('[data-testid="weekly-target-grid"]')
      if (!el) {
        throw new Error("weekly-target-grid not found")
      }
      return el.scrollWidth <= el.clientWidth + 1
    })
    expect(fitsViewport).toBe(true)

    // モバイルカードレイアウトが表示されていること
    await expect(authenticatedPage.locator('[data-testid="weekly-target-cards"]')).toBeVisible()
    // 入力欄が表示・操作可能であること(aria-label 経由)
    await expect(
      authenticatedPage.getByRole("spinbutton", { name: /の月曜日の目標ユニット/ }).first(),
    ).toBeVisible()

    await expectNoDocumentHorizontalOverflow(authenticatedPage)
  })
})
