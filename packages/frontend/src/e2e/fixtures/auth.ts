import { test as base } from "@playwright/test"
import { testUser } from "./test-data"

/**
 * 認証済みページのフィクスチャ
 * MSWモード・実APIモードの両方に対応
 */
export const test = base.extend({
  /**
   * 認証済みページを提供するフィクスチャ
   */
  authenticatedPage: async ({ page, context }, use) => {
    const useMsw = process.env.E2E_USE_MSW === "true"

    if (useMsw) {
      // MSWモード: 認証は不要（MSWが全てのリクエストをモック）
      await page.goto("/")
    } else {
      // 実APIモード: テスト用トークンを使用して認証
      await context.addCookies([
        {
          name: "auth_token",
          value: testUser.token,
          domain: "localhost",
          path: "/",
        },
      ])
      await page.goto("/")
    }

    await use(page)
  },
})

export { expect } from "@playwright/test"
