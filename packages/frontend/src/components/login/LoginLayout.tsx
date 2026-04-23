import type { ReactNode } from "react"
import { LoginBackground } from "./LoginBackground"
import { LoginFooter } from "./LoginFooter"

type Props = {
  children: ReactNode
}

/**
 * ログインページ全体の3レイヤー構造（背景／装飾／前面コンテンツ）のラッパー
 */
export function LoginLayout({ children }: Props) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-tasche-ivory text-tasche-text">
      <LoginBackground />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-between px-6 py-6">
        <div className="flex-1 min-h-[40px]" />
        <main className="w-full max-w-[440px] text-center flex flex-col items-center">
          {children}
        </main>
        <div className="flex-1 min-h-[40px]" />
        <LoginFooter />
      </div>
    </div>
  )
}
