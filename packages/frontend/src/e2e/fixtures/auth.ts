import { test as base, type Page, type Route } from "@playwright/test"
import { getApiBaseUrl } from "../utils/api-base-url"
import { E2E_STUB_USER_EMAIL } from "../utils/test-auth"

export type AuthFixture = {
  loginAs: (email?: string) => Promise<void>
}

type ApiAuthFixture = {
  setToken: (token: string | null) => Promise<void>
}

type StubLoginResponse = {
  data: {
    access_token: string
  }
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
   *
   * page.request でブラウザコンテキストから stub-login を呼ぶことで、
   * refresh token cookie がブラウザのクッキージャーに設定される。
   * その後 page.goto("/") した際に useBootstrapAuth が /api/auth/refresh を呼ぶと
   * cookie が Vite proxy 経由でバックエンドに届き、認証状態が復元される。
   */
  authenticatedPage: async ({ page }, use) => {
    const useMsw = process.env.E2E_USE_MSW === "true"

    if (useMsw) {
      await page.goto("/login")
      await page.getByRole("button", { name: /スタブログイン/ }).click()
      await page.waitForURL("**/")
    } else {
      await page.request.post(new URL("/api/auth/stub-login", getApiBaseUrl()).toString(), {
        data: { email: E2E_STUB_USER_EMAIL },
      })
      await page.goto("/")
    }

    await use(page)
  },

  auth: async ({ page, apiAuth }, use) => {
    const useMsw = process.env.E2E_USE_MSW === "true"

    const loginAs: AuthFixture["loginAs"] = async (email) => {
      if (useMsw) {
        await page.goto("/login")
        await page.getByRole("button", { name: /スタブログイン/ }).click()
        await page.waitForURL("**/")
        return
      }

      const res = await page.request.post(
        new URL("/api/auth/stub-login", getApiBaseUrl()).toString(),
        { data: { email: email ?? E2E_STUB_USER_EMAIL } },
      )
      const json = (await res.json()) as StubLoginResponse
      await apiAuth.setToken(json.data.access_token)
    }

    await use({ loginAs })
  },
})

export { expect } from "@playwright/test"
