import { test as base, type Page, type Route } from "@playwright/test"
import { getTestAuthToken, type TestAuthUser } from "../utils/test-auth"
import { testUsers } from "./test-data"

/**
 * 認証済みページのフィクスチャ
 * MSWモード・実APIモードの両方に対応
 */
export type AuthFixture = {
  loginAs: (user?: TestAuthUser) => Promise<void>
}

type ApiAuthFixture = {
  setToken: (token: string | null) => Promise<void>
}

export const test = base.extend<{
  authenticatedPage: Page
  auth: AuthFixture
  apiAuth: ApiAuthFixture
}>({
  apiAuth: async ({ page }, use) => {
    let currentToken: string | null = null
    const routeHandler = (route: Route) => {
      const request = route.request()
      const headers = {
        ...request.headers(),
        ...(currentToken ? { authorization: `Bearer ${currentToken}` } : {}),
      }

      void route.continue({ headers })
    }

    await page.route("**/api/**", routeHandler)

    await use({
      setToken: async (token) => {
        currentToken = token
      },
    })

    await page.unroute("**/api/**", routeHandler)
  },
  /**
   * 認証済みページを提供するフィクスチャ
   */
  authenticatedPage: async ({ page, apiAuth }, use) => {
    const useMsw = process.env.E2E_USE_MSW === "true"

    if (useMsw) {
      // MSWモード: 認証は不要（MSWが全てのリクエストをモック）
      await page.goto("/")
    } else {
      // 実APIモード: テスト用トークンを取得してAPIリクエストに付与
      const token = await getTestAuthToken({ email: testUsers.primary.email })
      await apiAuth.setToken(token)
      await page.goto("/")
    }

    await use(page)
  },
  auth: async ({ apiAuth }, use) => {
    const useMsw = process.env.E2E_USE_MSW === "true"

    const loginAs: AuthFixture["loginAs"] = async (user) => {
      if (useMsw) {
        return
      }

      const token = await getTestAuthToken(user)
      await apiAuth.setToken(token)
    }

    await use({ loginAs })
  },
})

export { expect } from "@playwright/test"
