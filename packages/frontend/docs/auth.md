# 認証モジュール設計

## 概要

`src/auth/` 配下に Google OAuth 2.0 BFF 型 + PKCE 認証の基盤モジュールがあります。

---

## 状態管理（Jotai Atom）

`src/auth/atoms.ts` で 2 つの atom を定義しています。

| atom | 型 | 説明 |
|------|----|------|
| `authStatusAtom` | `AuthStatus` | 認証状態（`"loading"` / `"authenticated"` / `"anonymous"` / `"error"`） |
| `currentUserAtom` | `AuthUser \| null` | ログイン中のユーザー情報 |

**状態遷移**:

```
起動時
  └─ "loading"
       ├─ GET /api/users/me 成功 → "authenticated"
       ├─ GET /api/users/me が 401 → "anonymous"
       └─ GET /api/users/me が 5xx 等 → "error"

ログイン成功 → "authenticated"
ログアウト / 401 受信 → "anonymous"
```

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

## Cookie 認証専用 fetch ラッパ

### `src/auth/authClient.ts`

標準 `fetch` を薄くラップした `AuthClient` を提供します。

**主な機能**:
- `credentials: "include"` を全リクエストに付与し、HttpOnly Cookie（`session`）をブラウザに自動送信させる
- Authorization ヘッダは付与しない（Cookie が認証の唯一の手段）
- 401 を受けたら `onUnauthorized` を呼び出してセッション失効を通知し、例外を throw する（リトライは行わない）

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
| `handleCallback(params)` | state 検証 → `/api/auth/google/callback` → レスポンスの `data`（UserResponse）を `setCurrentUser` に使用 → `/api/settings` 取得 → atom 更新 → `/` へ遷移 |
| `stubLogin(email, name?)` | `/api/auth/stub-login` → レスポンスの `data`（UserResponse）を `setCurrentUser` に使用 → atom 更新 → `/` へ遷移 |
| `logout()` | `/api/auth/logout` → atom リセット → `/login` へ遷移 |

**`handleCallback` のポイント**: バックエンドが `Set-Cookie` でセッションを確立し、レスポンスボディに `{ data: UserResponse }` を返す。フロントエンドはレスポンスの `data` を直接 `setCurrentUser` に渡す（`/api/users/me` の再呼び出しは不要）。

### `src/auth/useBootstrapAuth.ts`

アプリ起動時（`App.tsx`）に 1 度だけ実行される。`/api/users/me` と `/api/settings` を **並列** で取得し、`me` の結果で `authStatus` を決定します。

- `me` が 200: `currentUserAtom` を更新 → `authStatus = "authenticated"`
- `me` が 401: 未認証 → `authStatus = "anonymous"`（settings の結果は無視）
- `me` が 5xx 等: `authStatus = "error"`

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

`src/mocks/handlers/auth.ts` はモジュールスコープの `getMockAuthUser()` でセッションを模擬します。

- `currentUser` が null の場合、`GET /api/users/me` は 401 を返す → `authStatus = "anonymous"` → `/login` にリダイレクト
- スタブログイン後は `currentUser` が設定される → 以降の `GET /api/users/me` は 200 を返す

HttpOnly Cookie の擬似として `getMockAuthUser()` ベースで認証ガードを実装しています（MSW モードではブラウザの Cookie 機能に依存しない）。

`src/mocks/handlers/index.ts` では `authHandlers` を **先頭** に配置しており、orval 生成ハンドラの重複を上書きします。

---

## セキュリティ原則

| 項目 | 方針 |
|------|------|
| セッション Cookie | HttpOnly のためJavaScript からアクセス不可。ブラウザが自動管理 |
| Cookie 送信 | `credentials: "include"` で送受信（SameSite=Lax + Path=/api） |
| code_verifier / state | `sessionStorage`（XSS 面最小化 + ページ遷移対応） |
| アクセストークン | 廃止（セッション Cookie に一本化） |
