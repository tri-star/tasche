import { expect, test } from "@/e2e/fixtures/auth"

const routes = [
  { path: "/", readyText: "今日の目標" },
  { path: "/tasks", readyText: "タスク一覧" },
  { path: "/goals", readyText: "1ユニットの時間を選んでください" },
  { path: "/settings", readyText: "設定" },
  { path: "/account", readyText: "アカウント" },
]

const viewports = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
]

async function expectNoDocumentHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => ({
    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
  }))

  expect(overflow.documentOverflow).toBeLessThanOrEqual(1)
  expect(overflow.bodyOverflow).toBeLessThanOrEqual(1)
}

async function expectShellVisible(page: import("@playwright/test").Page) {
  await expect(page.getByRole("banner")).toBeVisible()
  await expect(page.getByRole("navigation", { name: "アプリナビゲーション" })).toBeVisible()

  for (const label of ["ダッシュボード", "タスク管理", "目標設定", "設定", "アカウント"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible()
  }
}

async function expectNoHeaderNavMainOverlap(
  page: import("@playwright/test").Page,
  viewportName: string,
) {
  const boxes = await page.evaluate(() => {
    const header = document.querySelector("header")
    const nav = document.querySelector('nav[aria-label="アプリナビゲーション"]')
    const main = document.querySelector("main")
    if (!header || !nav || !main) {
      throw new Error("App shell elements not found")
    }

    const headerBox = header.getBoundingClientRect()
    const navBox = nav.getBoundingClientRect()
    const mainBox = main.getBoundingClientRect()
    return {
      header: {
        bottom: headerBox.bottom,
      },
      nav: {
        right: navBox.right,
        y: navBox.y,
      },
      main: {
        left: mainBox.left,
      },
    }
  })

  if (viewportName === "mobile-375") {
    expect(boxes.nav.y).toBeGreaterThanOrEqual(boxes.header.bottom)
    return
  }

  expect(boxes.nav.right).toBeLessThanOrEqual(boxes.main.left + 1)
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

test.describe("AppShell responsive layout", () => {
  test("各代表幅で主要画面の共通ナビが表示され、ページ全体が横にはみ出さない", async ({
    authenticatedPage,
  }) => {
    for (const viewport of viewports) {
      await authenticatedPage.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const route of routes) {
        await authenticatedPage.goto(route.path)
        await expect(authenticatedPage.getByText(route.readyText).first()).toBeVisible()
        await expectShellVisible(authenticatedPage)
        await expectNoDocumentHorizontalOverflow(authenticatedPage)
        await expectNoHeaderNavMainOverlap(authenticatedPage, viewport.name)

        if (viewport.name === "mobile-375" && route.path === "/") {
          await expectFabAvoidsMobileNav(authenticatedPage)
        }
      }
    }
  })

  test("mobile の下部ナビから主要画面へ SPA 遷移できる", async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 812 })
    await authenticatedPage.goto("/")

    for (const route of [
      { label: "タスク管理", path: "/tasks", readyText: "タスク一覧" },
      { label: "目標設定", path: "/goals", readyText: "1ユニットの時間を選んでください" },
      { label: "設定", path: "/settings", readyText: "設定" },
      { label: "アカウント", path: "/account", readyText: "アカウント" },
      { label: "ダッシュボード", path: "/", readyText: "今日の目標" },
    ]) {
      await authenticatedPage.getByRole("link", { name: route.label }).click()
      await authenticatedPage.waitForURL(`**${route.path}`)
      await expect(authenticatedPage.getByText(route.readyText).first()).toBeVisible()
    }
  })

  test("MSW の dark mode でも共通シェルが表示され、横にはみ出さない", async ({
    authenticatedPage,
  }) => {
    test.skip(process.env.E2E_USE_MSW !== "true", "MSWモックデータ専用のテスト")

    await authenticatedPage.goto("/settings")
    await authenticatedPage.getByRole("switch", { name: "ダークモード切替" }).click()
    await expect(authenticatedPage.locator("html")).toHaveClass(/dark/)

    for (const viewport of [
      { width: 375, height: 812 },
      { width: 1280, height: 900 },
    ]) {
      await authenticatedPage.setViewportSize(viewport)
      await authenticatedPage.goto("/")
      await expect(authenticatedPage.getByText("今日の目標").first()).toBeVisible()
      await expectShellVisible(authenticatedPage)
      await expectNoDocumentHorizontalOverflow(authenticatedPage)
    }
  })
})
