import { testUser } from "./fixtures/test-data"

/**
 * グローバルセットアップ（実APIモード用）
 * テスト用トークンを取得してテスト全体で使用できるようにする
 */
async function globalSetup() {
  const apiBaseURL = process.env.E2E_API_BASE_URL || "http://localhost:8000"

  console.log("🔧 E2E Global Setup: 実APIモード")
  console.log(`📡 API Base URL: ${apiBaseURL}`)

  // 実APIモードの場合、バックエンドが ENABLE_TEST_AUTH=true で起動されていることを前提とする
  // テスト用トークンはフィクスチャで定義されている testUser.token を使用
  console.log("✅ テスト用トークンを使用:", testUser.token)

  // 必要に応じて、ここでAPIヘルスチェックを実行
  try {
    const response = await fetch(`${apiBaseURL}/health`, {
      method: "GET",
    })
    if (!response.ok) {
      console.warn("⚠️  API health check failed, but continuing with tests")
    } else {
      console.log("✅ API health check passed")
    }
  } catch (error) {
    console.warn("⚠️  API health check error:", error)
    console.log("Continuing with tests anyway...")
  }
}

export default globalSetup
