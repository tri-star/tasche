import { atom } from "jotai"
import type { AuthUser } from "./types"

// 認証状態の4値:
//  - "loading"       : 起動時に /api/users/me でセッション確認中
//  - "authenticated" : セッション有効（me 取得成功）
//  - "anonymous"     : 未認証（me が 401）
//  - "error"         : 想定外エラー
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error"
export const authStatusAtom = atom<AuthStatus>("loading")

export const currentUserAtom = atom<AuthUser | null>(null)
