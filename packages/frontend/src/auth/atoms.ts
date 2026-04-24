import { atom } from "jotai"
import type { AuthUser } from "./types"

// アクセストークンはメモリのみ。永続化しない。
export const accessTokenAtom = atom<string | null>(null)

// 認証状態の4値:
//  - "loading"       : 起動時に refresh を試行中
//  - "authenticated" : access token あり
//  - "anonymous"     : 未認証
//  - "error"         : 想定外エラー
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error"
export const authStatusAtom = atom<AuthStatus>("loading")

export const currentUserAtom = atom<AuthUser | null>(null)
