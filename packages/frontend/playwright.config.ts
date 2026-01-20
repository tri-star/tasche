import { defineConfig, devices } from "@playwright/test"

/**
 * E2Eテストモードの環境変数
 * - E2E_USE_MSW: MSWモックを使用するかどうか (true/false)
 * - E2E_BASE_URL: フロントエンドのベースURL
 * - E2E_API_BASE_URL: バックエンドAPIのベースURL（実APIモードのみ）
 */
const useMsw = process.env.E2E_USE_MSW === "true"
const baseURL = process.env.E2E_BASE_URL || "http://localhost:5173"
const apiBaseURL = process.env.E2E_API_BASE_URL || "http://localhost:8000"

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.e2e.spec.ts",

  // テスト実行設定
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  timeout: 5000,

  // レポート設定
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // グローバルセットアップ（実APIモードのみ）
  globalSetup: useMsw ? undefined : "./src/e2e/global-setup.ts",

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: {
          // MSWモードの場合は環境変数をコンテキストに渡す
          ...(useMsw && {
            storageState: undefined,
          }),
        },
      },
    },
  ],

  // 開発サーバー設定
  webServer: {
    command: useMsw ? "pnpm dev" : `VITE_USE_MSW=false VITE_API_BASE_URL=${apiBaseURL} pnpm dev`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
})
