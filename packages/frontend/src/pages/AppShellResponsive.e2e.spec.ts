import type { Page } from "@playwright/test"
import { expect, test } from "@/e2e/fixtures/auth"
import { expectNoDocumentHorizontalOverflow } from "@/e2e/helpers/responsive"

const routes = [
  { path: "/", waitForReady: waitForDashboardReady },
  {
    path: "/tasks",
    waitForReady: (page: Page) => waitForMainHeading(page, "タスク一覧"),
  },
  {
    path: "/goals",
    waitForReady: (page: Page) => waitForMainText(page, "1ユニットの時間を選んでください"),
  },
  {
    path: "/settings",
    waitForReady: (page: Page) => waitForMainHeading(page, "設定"),
  },
  {
    path: "/account",
    waitForReady: (page: Page) => waitForMainHeading(page, "アカウント"),
  },
]

const viewports = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
]

async function waitForMainHeading(page: Page, name: string) {
  await expect(page.getByRole("main").getByRole("heading", { name })).toBeVisible()
}

async function waitForMainText(page: Page, text: string) {
  await expect(page.getByRole("main").getByText(text)).toBeVisible()
}

async function waitForDashboardReady(page: Page) {
  const main = page.getByRole("main")
  await expect(main.getByText(/今日の目標|今週はまだ予定がありません/).first()).toBeVisible()
}

async function expectShellVisible(page: Page) {
  await expect(page.getByRole("banner")).toBeVisible()
  const navigation = page.getByRole("navigation", { name: "アプリナビゲーション" })
  await expect(navigation).toBeVisible()

  for (const label of ["ダッシュボード", "タスク管理", "目標設定", "設定", "アカウント"]) {
    await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible()
  }
}

async function expectNoNavMainOverlap(page: Page, viewportName: string) {
  const boxes = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="アプリナビゲーション"]')
    const main = document.querySelector("main")
    if (!nav || !main) {
      throw new Error("App shell elements not found")
    }

    const navBox = nav.getBoundingClientRect()
    const mainBox = main.getBoundingClientRect()
    return {
      nav: {
        top: navBox.top,
        right: navBox.right,
      },
      main: {
        left: mainBox.left,
      },
    }
  })

  if (viewportName === "mobile-375") {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const endOfContent = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="アプリナビゲーション"]')
      const main = document.querySelector("main")
      const lastChild = main?.lastElementChild
      if (!nav || !lastChild) {
        throw new Error("Mobile shell elements not found")
      }

      const navBox = nav.getBoundingClientRect()
      const contentBox = lastChild.getBoundingClientRect()
      return {
        contentBottom: contentBox.bottom,
        navTop: navBox.top,
      }
    })

    expect(endOfContent.contentBottom).toBeLessThanOrEqual(endOfContent.navTop + 1)
    return
  }

  expect(boxes.nav.right).toBeLessThanOrEqual(boxes.main.left + 1)
}

async function expectFabAvoidsMobileNav(page: Page) {
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
  test.setTimeout(30_000)

  test("各代表幅で主要画面の共通ナビが表示され、ページ全体が横にはみ出さない", async ({
    authenticatedPage,
  }) => {
    for (const viewport of viewports) {
      await authenticatedPage.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const route of routes) {
        await authenticatedPage.goto(route.path)
        await route.waitForReady(authenticatedPage)
        await expectShellVisible(authenticatedPage)
        await expectNoDocumentHorizontalOverflow(authenticatedPage)
        await expectNoNavMainOverlap(authenticatedPage, viewport.name)

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
      {
        label: "タスク管理",
        path: "/tasks",
        waitForReady: (page: Page) => waitForMainHeading(page, "タスク一覧"),
      },
      {
        label: "目標設定",
        path: "/goals",
        waitForReady: (page: Page) => waitForMainText(page, "1ユニットの時間を選んでください"),
      },
      {
        label: "設定",
        path: "/settings",
        waitForReady: (page: Page) => waitForMainHeading(page, "設定"),
      },
      {
        label: "アカウント",
        path: "/account",
        waitForReady: (page: Page) => waitForMainHeading(page, "アカウント"),
      },
      { label: "ダッシュボード", path: "/", waitForReady: waitForDashboardReady },
    ]) {
      await authenticatedPage
        .getByRole("navigation", { name: "アプリナビゲーション" })
        .getByRole("link", { name: route.label, exact: true })
        .click()
      await authenticatedPage.waitForURL(`**${route.path}`)
      await route.waitForReady(authenticatedPage)
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
      await waitForDashboardReady(authenticatedPage)
      await expectShellVisible(authenticatedPage)
      await expectNoDocumentHorizontalOverflow(authenticatedPage)
    }
  })
})
