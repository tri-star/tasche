import { test as base, type Page } from "@playwright/test"
import { getApiBaseUrl } from "../utils/api-base-url"
import { E2E_STUB_USER_EMAIL } from "../utils/test-auth"

export type AuthFixture = {
  loginAs: (email?: string) => Promise<void>
}

async function loginWithMswStub(page: Page, email: string): Promise<void> {
  await page.goto("/login")

  await page.evaluate(
    async ({ stubEmail }) => {
      const user = { email: stubEmail, name: "テストユーザー" }
      const response = await fetch("/api/auth/stub-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(user),
      })

      if (!response.ok) {
        throw new Error(`stub-login failed: ${response.status} ${response.statusText}`)
      }
      // setMockAuthUser ハンドラが sessionStorage への書き込みを行うため、ここでの手動書き込みは不要
    },
    { stubEmail: email },
  )

  await gotoAuthenticatedRoot(page)
}

async function gotoAuthenticatedRoot(page: Page): Promise<void> {
  // /api/users/me の応答を待って認証状態の復元を確認する
  const meResponse = page.waitForResponse(
    (response) => response.url().includes("/api/users/me") && response.request().method() === "GET",
  )

  await page.goto("/")
  const response = await meResponse

  if (!response.ok()) {
    throw new Error(`auth me failed: ${response.status()} ${response.statusText()}`)
  }

  await page.waitForURL("**/")
}

export const test = base.extend<{
  authenticatedPage: Page
  auth: AuthFixture
}>({
  /**
   * 認証済みページを提供するフィクスチャ
   *
   * MSW モード: loginWithMswStub で stub-login を呼び、getMockAuthUser を設定する。
   *             リロード後も sessionStorage から復元されてログイン状態が維持される。
   *
   * 実 API モード: page.request（= browserContext.request）で stub-login を呼ぶことで、
   *               backend が Set-Cookie したセッション Cookie がブラウザの cookie jar に保存される。
   *               その後 page.goto("/") したとき Cookie が /api/* へ自動送信され、認証状態が復元される。
   */
  authenticatedPage: async ({ page }, use) => {
    const useMsw = process.env.E2E_USE_MSW === "true"

    if (useMsw) {
      await loginWithMswStub(page, E2E_STUB_USER_EMAIL)
    } else {
      const response = await page.request.post(
        new URL("/api/auth/stub-login", getApiBaseUrl()).toString(),
        {
          data: { email: E2E_STUB_USER_EMAIL },
        },
      )

      if (!response.ok()) {
        throw new Error(`stub-login failed: ${response.status()} ${response.statusText()}`)
      }

      await gotoAuthenticatedRoot(page)
    }

    await use(page)
  },

  auth: async ({ page }, use) => {
    const useMsw = process.env.E2E_USE_MSW === "true"

    const loginAs: AuthFixture["loginAs"] = async (email) => {
      if (useMsw) {
        await loginWithMswStub(page, email ?? E2E_STUB_USER_EMAIL)
        return
      }

      // 実 API モード: page.request でログインし、Cookie を context に載せる
      // レスポンスの ok のみ確認すれば十分（token は不要）
      const res = await page.request.post(
        new URL("/api/auth/stub-login", getApiBaseUrl()).toString(),
        { data: { email: email ?? E2E_STUB_USER_EMAIL } },
      )

      if (!res.ok()) {
        throw new Error(`stub-login failed: ${res.status()} ${res.statusText()}`)
      }
    }

    await use({ loginAs })
  },
})

export { expect } from "@playwright/test"
