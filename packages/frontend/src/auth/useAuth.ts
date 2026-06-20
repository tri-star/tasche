import { useQueryClient } from "@tanstack/react-query"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useNavigate } from "react-router-dom"
import { logger } from "@/lib/logger"
import { currentSettingsAtom } from "@/settings/atoms"
import type { Settings } from "@/settings/types"
import { authStatusAtom, currentUserAtom } from "./atoms"
import { createPkcePair } from "./pkce"
import { clearPendingOAuth, readPendingOAuth, savePendingOAuth } from "./storage"
import type { AuthUser } from "./types"

const BASE_URL = ""

/**
 * レスポンスが JSON であることを検証し、そうでなければエラーを投げる。
 * HTML が返された場合は CloudFront のカスタムエラーページによる置き換えを示す可能性が高い。
 */
async function parseJsonResponse<T>(res: Response, context: string): Promise<T> {
  const contentType = res.headers.get("Content-Type") ?? ""
  logger.debug(`[${context}] status=${res.status} content-type=${contentType}`)
  if (!contentType.includes("application/json")) {
    const body = await res.text()
    logger.error(
      `[${context}] Non-JSON response received. status=${res.status} content-type=${contentType} body(first 200)=${body.slice(0, 200)}`,
    )
    throw new Error(`サーバーから予期しない応答が返されました (status: ${res.status})`)
  }
  return res.json() as Promise<T>
}

async function fetchSettings(): Promise<Settings | null> {
  logger.debug("[fetchSettings] start")
  const res = await fetch(`${BASE_URL}/api/settings`, {
    credentials: "include",
  })
  if (!res.ok) {
    logger.error(`[fetchSettings] failed: status=${res.status}`)
    return null
  }
  const json = await parseJsonResponse<{ data: Settings }>(res, "fetchSettings")
  return json.data
}

export function useAuth() {
  const [status, setStatus] = useAtom(authStatusAtom)
  const setCurrentUser = useSetAtom(currentUserAtom)
  const setCurrentSettings = useSetAtom(currentSettingsAtom)
  const user = useAtomValue(currentUserAtom)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  /**
   * Google OAuth ログインを開始する
   * PKCE ペアと state を生成し、sessionStorage に保存してから認可 URL へ遷移
   */
  async function startGoogleLogin(): Promise<void> {
    const { codeVerifier, codeChallenge, codeChallengeMethod } = await createPkcePair()
    const redirectUri = `${window.location.origin}/auth/callback`

    const params = new URLSearchParams({
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      redirect_uri: redirectUri,
    })

    logger.debug("[startGoogleLogin] requesting authorize URL")
    const res = await fetch(`${BASE_URL}/api/auth/google/authorize?${params.toString()}`, {
      credentials: "include",
    })

    if (!res.ok) {
      logger.error(`[startGoogleLogin] failed: status=${res.status}`)
      throw new Error("Failed to get authorization URL")
    }

    const json = await parseJsonResponse<{ data: { authorization_url: string; state: string } }>(
      res,
      "startGoogleLogin",
    )
    const { authorization_url: authorizationUrl, state } = json.data

    savePendingOAuth({
      state,
      codeVerifier,
      redirectUri,
      createdAt: Date.now(),
    })

    window.location.assign(authorizationUrl)
  }

  /**
   * /auth/callback から呼ばれるコールバック処理
   * state の検証、セッション確立、ユーザー情報取得を行う
   */
  async function handleCallback(searchParams: URLSearchParams): Promise<void> {
    const error = searchParams.get("error")
    if (error) {
      throw new Error("Google の認可がキャンセルされました")
    }

    const code = searchParams.get("code")
    const returnedState = searchParams.get("state")

    const pending = readPendingOAuth()
    if (!pending || !returnedState || pending.state !== returnedState) {
      throw new Error("セキュリティ検証に失敗しました")
    }

    logger.debug("[handleCallback] posting to /api/auth/google/callback")
    const res = await fetch(`${BASE_URL}/api/auth/google/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        code,
        code_verifier: pending.codeVerifier,
        redirect_uri: pending.redirectUri,
        state: returnedState,
      }),
    })

    if (!res.ok) {
      logger.error(`[handleCallback] callback API failed: status=${res.status}`)
      throw new Error("ログインに失敗しました")
    }

    // backend が Set-Cookie でセッションを確立し、{ data: UserResponse } を返す
    const json = await parseJsonResponse<{ data: AuthUser }>(res, "handleCallback")
    const userInfo = json.data

    const settings = await fetchSettings()
    setCurrentUser(userInfo)
    if (settings) setCurrentSettings(settings)
    setStatus("authenticated")

    clearPendingOAuth()
    navigate("/", { replace: true })
  }

  /**
   * スタブログイン（開発用）
   */
  async function stubLogin(email: string, name?: string): Promise<void> {
    logger.debug("[stubLogin] posting to /api/auth/stub-login")
    const res = await fetch(`${BASE_URL}/api/auth/stub-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, name }),
    })

    if (!res.ok) {
      logger.error(`[stubLogin] failed: status=${res.status}`)
      throw new Error("スタブログインに失敗しました")
    }

    // backend が Set-Cookie でセッションを確立し、{ data: UserResponse } を返す
    const json = await parseJsonResponse<{ data: AuthUser }>(res, "stubLogin")
    const userInfo = json.data

    const settings = await fetchSettings()
    setCurrentUser(userInfo)
    if (settings) setCurrentSettings(settings)
    setStatus("authenticated")

    navigate("/", { replace: true })
  }

  /**
   * ログアウト
   */
  async function logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } finally {
      queryClient.clear()
      setCurrentUser(null)
      setStatus("anonymous")
      navigate("/login", { replace: true })
    }
  }

  return {
    status,
    user,
    startGoogleLogin,
    handleCallback,
    stubLogin,
    logout,
  }
}
