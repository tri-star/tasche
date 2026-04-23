import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/auth/useAuth"
import { GoogleLoginButton } from "@/components/login/GoogleLoginButton"
import { LoginLayout } from "@/components/login/LoginLayout"
import { StubLoginButton } from "@/components/login/StubLoginButton"
import { TascheLogo } from "@/components/login/TascheLogo"

/**
 * ログインページ
 * ロジックは useAuth のみに集約し、UI の描画に専念する
 */
export function LoginPage() {
  const { startGoogleLogin, stubLogin, status } = useAuth()
  const navigate = useNavigate()
  const stubEnabled = import.meta.env.VITE_AUTH_STUB_ENABLED === "true"

  // 認証済みの場合はダッシュボードへリダイレクト
  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true })
    }
  }, [status, navigate])

  return (
    <LoginLayout>
      <TascheLogo />
      <p className="text-sm text-tasche-textSub leading-[1.8] mb-9 text-center">
        Tasche をご利用いただくには
        <br />
        Google アカウントでログインしてください。
      </p>
      <GoogleLoginButton onClick={startGoogleLogin} />
      {stubEnabled && <StubLoginButton onLogin={stubLogin} />}
    </LoginLayout>
  )
}
