# 認証モジュール設計

## 概要

`src/auth/` 配下に Google OAuth 2.0 BFF 型 + PKCE 認証の基盤モジュールがあります。

---

## 状態管理（Jotai Atom）

`src/auth/atoms.ts` で 3 つの atom を定義しています。

| atom | 型 | 説明 |
|------|----|------|
| `accessTokenAtom` | `string \| null` | アクセストークン（インメモリのみ、永続化しない） |
| `authStatusAtom` | `AuthStatus` | 認証状態（`"loading"` / `"authenticated"` / `"anonymous"` / `"error"`） |
| `currentUserAtom` | `AuthUser \| null` | ログイン中のユーザー情報 |

**状態遷移**:

```
起動時
  └─ "loading"
       ├─ POST /api/auth/refresh 成功 → "authenticated"
       └─ 失敗 → "anonymous"

ログイン成功 → "authenticated"
ログアウト / refresh 失敗 → "anonymous"
```

> `accessTokenAtom` は `localStorage` / `sessionStorage` に書かず、XSS による漏洩リスクを最小化しています。

---

## PKCE と state の生成・保管

### `src/auth/pkce.ts`

oauth4webapi を使用して PKCE ペアと state を生成します。

```ts
createPkcePair() → { codeVerifier, codeChallenge, codeChallengeMethod: "S256" }
createState()    → string（ランダム）
```

### `src/auth/storage.ts`

`sessionStorage` に OAuth の pending 情報（state / code_verifier / redirectUri / createdAt）を保管します。

- キー: `"tasche.oauth.pending"`
- 10 分以上経過した値は自動破棄
- タブを閉じると自動消去（sessionStorage の仕様）

`localStorage` を使わない理由: 他タブとの共有を防ぎ、短命な値として管理するため。

---

## 自動リフレッシュ fetch ラッパ

### `src/auth/authClient.ts`

標準 `fetch` を薄くラップした `AuthClient` を提供します。

**主な機能**:
- すべてのリクエストに `Authorization: Bearer <token>` を付与
- すべての `/api/auth/*` リクエストに `credentials: "include"` を付与（Cookie 送受信に必須）
- 401 応答時に `/api/auth/refresh` を 1 回呼び出してリトライ
- 並行して複数の 401 が発生した場合、`/api/auth/refresh` は **1 回のみ**呼び出す（Promise キャッシュによる直列化）
- refresh も失敗した場合、`onUnauthorized` を呼び出してログアウト処理を行う

### `src/auth/authClientSingleton.ts`

orval の mutator はモジュールレベルで解決されるため、`AuthClient` をシングルトンとして保持します。

```ts
setAuthClient(client: AuthClient): void  // main.tsx で初期化
getAuthClient(): AuthClient             // authFetch.ts から参照
```

### `src/auth/authFetch.ts`

orval mutator 関数。全ての orval 生成 API クライアントがこの関数を通してリクエストを送ります。

```ts
// orval.config.ts の output.mutator に指定
export async function authFetch<T>(config, options?): Promise<T>
```

---

## フック

### `src/auth/useAuth.ts`

ログイン・ログアウト・コールバック処理をまとめたフック。

| 関数 | 説明 |
|------|------|
| `startGoogleLogin()` | PKCE ペア生成 → storage 保存 → `/api/auth/google/authorize` → `window.location.assign` |
| `handleCallback(params)` | state 検証 → `/api/auth/google/callback` → atom 更新 → `/api/users/me` → `/` へ遷移 |
| `stubLogin(email, name?)` | `/api/auth/stub-login` → atom 更新 → `/` へ遷移 |
| `logout()` | `/api/auth/logout` → atom リセット → `/login` へ遷移 |

### `src/auth/useBootstrapAuth.ts`

アプリ起動時（`App.tsx`）に 1 度だけ `POST /api/auth/refresh` を呼び出し、既存のリフレッシュ Cookie からセッションを復元します。

React 19 StrictMode の二重実行に対して `useRef` で `started` フラグを管理し、重複実行を防止しています。

---

## ProtectedRoute

`src/components/routing/ProtectedRoute.tsx`

`authStatusAtom` を参照し、未認証ユーザーを `/login` にリダイレクトします。

| 状態 | 動作 |
|------|------|
| `"loading"` | フルスクリーンスピナーを表示 |
| `"authenticated"` | `<Outlet />` を描画（子ルートを表示） |
| それ以外 | `/login` へリダイレクト |

---

## MSW ハンドラ

`src/mocks/handlers/auth.ts` はモジュールスコープの `currentUser` 変数でセッションを模擬します。

- 初回ロード時は `currentUser = null` → `POST /api/auth/refresh` が 401 を返す → `authStatus = "anonymous"` → `/login` にリダイレクト
- スタブログイン後は `currentUser` が設定される → 以降の `refresh` は 200 を返す

`src/mocks/handlers/index.ts` では `authHandlers` を **先頭** に配置しており、orval 生成ハンドラの重複を上書きします。

---

## セキュリティ原則

| 項目 | 方針 |
|------|------|
| アクセストークン | インメモリ atom のみ。`localStorage` / `sessionStorage` に書かない |
| code_verifier / state | `sessionStorage`（XSS 面最小化 + ページ遷移対応） |
| Cookie | `credentials: "include"` で送受信（HttpOnly Cookie はブラウザが自動管理） |
| refresh 直列化 | 並行 401 で `/api/auth/refresh` を複数回呼ばないよう Promise をキャッシュ |
