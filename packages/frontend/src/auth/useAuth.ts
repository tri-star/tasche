import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useNavigate } from "react-router-dom"
import { accessTokenAtom, authStatusAtom, currentUserAtom } from "./atoms"
import { createPkcePair, createState } from "./pkce"
import { clearPendingOAuth, readPendingOAuth, savePendingOAuth } from "./storage"
import type { AuthUser, TokenResponse } from "./types"

const BASE_URL = ""

async function fetchUserMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch user info")
  }
  const json = await res.json()
  return (json as { data: AuthUser }).data
}

export function useAuth() {
  const [status, setStatus] = useAtom(authStatusAtom)
  const [, setAccessToken] = useAtom(accessTokenAtom)
  const accessToken = useAtomValue(accessTokenAtom)
  const setCurrentUser = useSetAtom(currentUserAtom)
  const user = useAtomValue(currentUserAtom)
  const navigate = useNavigate()

  /**
   * Google OAuth ログインを開始する
   * PKCE ペアと state を生成し、sessionStorage に保存してから認可 URL へ遷移
   */
  async function startGoogleLogin(): Promise<void> {
    const { codeVerifier, codeChallenge, codeChallengeMethod } = await createPkcePair()
    const state = createState()
    const redirectUri = `${window.location.origin}/auth/callback`

    savePendingOAuth({
      state,
      codeVerifier,
      redirectUri,
      createdAt: Date.now(),
    })

    const params = new URLSearchParams({
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      redirect_uri: redirectUri,
    })

    const res = await fetch(`${BASE_URL}/api/auth/google/authorize?${params.toString()}`, {
      credentials: "include",
    })

    if (!res.ok) {
      throw new Error("Failed to get authorization URL")
    }

    const json = await res.json()
    const authorizationUrl = (json as { data: { authorization_url: string } }).data
      .authorization_url

    window.location.assign(authorizationUrl)
  }

  /**
   * /auth/callback から呼ばれるコールバック処理
   * state の検証、トークン交換、ユーザー情報取得を行う
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
      throw new Error("ログインに失敗しました")
    }

    const json = await res.json()
    const tokenData = (json as { data: TokenResponse }).data
    const { access_token } = tokenData

    setAccessToken(access_token)

    const userInfo = await fetchUserMe(access_token)
    setCurrentUser(userInfo)
    setStatus("authenticated")

    clearPendingOAuth()
    navigate("/", { replace: true })
  }

  /**
   * スタブログイン（開発用）
   */
  async function stubLogin(email: string, name?: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/auth/stub-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, name }),
    })

    if (!res.ok) {
      throw new Error("スタブログインに失敗しました")
    }

    const json = await res.json()
    const tokenData = (json as { data: TokenResponse }).data
    const { access_token } = tokenData

    setAccessToken(access_token)

    const userInfo = await fetchUserMe(access_token)
    setCurrentUser(userInfo)
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
        headers: {
          Authorization: `Bearer ${accessToken ?? ""}`,
        },
      })
    } finally {
      setAccessToken(null)
      setCurrentUser(null)
      setStatus("anonymous")
      navigate("/login", { replace: true })
    }
  }

  return {
    status,
    user,
    accessToken,
    startGoogleLogin,
    handleCallback,
    stubLogin,
    logout,
  }
}
