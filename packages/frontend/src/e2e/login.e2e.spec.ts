import { expect, test } from "@playwright/test"

test("スタブログインでダッシュボードに遷移する", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("button", { name: "Google でログイン" })).toBeVisible()
  await page.getByRole("button", { name: /スタブログイン/ }).click()
  await page.waitForURL("/")
  await expect(page.getByText("今日の目標")).toBeVisible()
})

test("未認証ユーザーは / にアクセスすると /login にリダイレクトされる", async ({ page }) => {
  await page.goto("/")
  await page.waitForURL("/login")
})
