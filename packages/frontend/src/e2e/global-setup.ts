import { getApiBaseUrl } from "./utils/api-base-url"

/**
 * グローバルセットアップ（実APIモード用）
 * バックエンド疎通確認のみを行う
 */
async function globalSetup() {
  const apiBaseURL = getApiBaseUrl()

  console.log("🔧 E2E Global Setup: 実APIモード")
  console.log(`📡 API Base URL: ${apiBaseURL}`)

  // 実APIモードの場合、バックエンドが ENABLE_TEST_AUTH=true で起動されていることを前提とする

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
