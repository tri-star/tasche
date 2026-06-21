---
name: tasche-frontend-architecture-conventions
description: Tascheフロントエンドの確立済みアーキテクチャ規約（フォルダ構造・認証・状態管理・orval・ルーティング）
metadata:
  type: project
---

## フォルダ構造規約 (docs/components.md 準拠)

- `components/ui/` — shadcn/Radix ベース、ビジネスロジック無し
- `components/common/` — アプリ共通コンポーネント（Header, ThemeToggle 等）
- `components/{feature}/` — ドメイン知識を持つ feature コンポーネント（例: `components/settings/`）
- `components/routing/` — ProtectedRoute 等ルーティング関連
- `pages/` — ルーティングの末端（DashboardPage, SettingsPage 等）
- `hooks/` — 共通カスタムフック
- `api/generated/` — orval 自動生成クライアント（直接呼び出し禁止）
- `auth/` — 認証モジュール（atoms, useBootstrapAuth 等）
- `settings/` — 設定モジュール（types, atoms）
- `mocks/handlers/` — MSW ハンドラ（リソース単位に分割）

## 認証保護パターン

- `ProtectedRoute` をネスト親として `router.tsx` に一元定義
- 個別ページでの認証チェック禁止
- `authStatusAtom` が "loading" | "authenticated" | "anonymous" | "error" の4値

## 状態管理規約

- サーバー状態: TanStack Query (useMutation は `useUpdateSettings` 等ラッパー経由)
- クライアントセッション状態: Jotai atom (`currentSettingsAtom`, `currentUserAtom`, `authStatusAtom` 等)
- `currentSettingsAtom` と `currentUserAtom` は別モジュール (`settings/atoms.ts`, `auth/atoms.ts`) で管理
- atom は `null` 初期値（未取得を表現）— `useBootstrapAuth` 内で初期化

## orval 生成コードの利用規約

- `api/generated/client.ts` の関数は直接 UI から呼ばない
- `hooks/useUpdateSettings.ts` 等ラッパーフックを介する
- bootstrap 時の生 fetch は例外（authFetch が使えないため）だが、レスポンス型は `SettingsResponse` 等 orval 生成型に合わせる

## ThemeProvider の配置

- `main.tsx` で `JotaiProvider > QueryClientProvider > ThemeProvider > App` の順にネスト
- `currentSettingsAtom.theme` を購読して `<html>` の dark クラスを同期
- DB が真実のソース。起動時フラッシュ防止のため localStorage をキャッシュとして使用（DB更新時に localStorage も更新）
- ログインページは ThemeProvider の外なので `dark` クラスが乗らない（ログインページはライトモード固定）
- theme === "system" のとき matchMedia change イベントを購読して OS テーマ変化に追従（useEffect クリーンアップで解除）
- `prefersDark()` / `resolveIsDark(theme)` は `theme/resolveSystemTheme.ts` に純粋関数として定義。ThemeProvider と useTheme の両方から呼ぶことで system 時の isDark を一元化している（TCH-69）

## デザイントークン構成（TCH-16）

- CSS カスタムプロパティは `index.css` の `:root` と `.dark` で定義（HSL 値のみ）
- Tailwind トークンは `tailwind.config.ts` の `theme.extend.colors` で `hsl(var(--xxx))` 形式で登録
- セマンティックトークン: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `border`, `input`, `ring`
- 状態色トークン: `destructive`, `success`, `warning`, `info`（各 DEFAULT + foreground + soft + soft-foreground）
- ブランド固有カラー: `tasche.*`（green/greenSoft/greenLeaf/ivory/text/textSub/textMuted/gold）はセマンティックトークンとは別枠。ログイン画面専用の意匠色として残存している。

## 開発専用ページ配置パターン（TCH-16）

- `pages/dev/` 配下に開発専用ページを配置（例: `DesignTokensPage.tsx`）
- `router.tsx` で `import.meta.env.DEV` による条件付きルート登録 `...(import.meta.env.DEV ? [...] : [])`
- パスは `/_dev/` プレフィックス（通常ルートと衝突しない）
- ProtectedRoute なし（認証不要）。認証不要でよい理由: 本番ビルドには含まれない開発専用ページのため

## MSW フラグ

- `VITE_USE_MSW=true` かつ `import.meta.env.DEV` の場合のみ起動
- `import("./mocks/browser")` の動的インポートでツリーシェイク可能

## 認証方式（TCH-75 以降: Cookie セッション方式）

- Bearer トークンは廃止。HttpOnly Cookie によるサーバ側セッション管理に移行済み
- `auth/atoms.ts`: `accessTokenAtom` なし。`authStatusAtom`（4値）と `currentUserAtom` のみ
- `authClient.ts`: `credentials: "include"` で fetch し、401 で `onUnauthorized` を呼ぶだけ。Authorization ヘッダ付与・refresh・リトライは持たない
- `onUnauthorized` は `main.tsx` で定義: `queryClient.clear()` → `currentUserAtom(null)` → `authStatusAtom("anonymous")` の順で実行
- `useBootstrapAuth`: 起動時に `/api/users/me` と `/api/settings` を並列 fetch してセッション復元。me 401 → anonymous（settings 結果は無視）
- `useAuth`: startGoogleLogin / handleCallback / stubLogin / logout を提供。TokenResponse 処理は不要（Cookie で完結）

## MSW での Cookie 認証代用パターン（TCH-75）

- HttpOnly Cookie はブラウザの Service Worker から読み書きできないため、MSW では `getMockAuthUser()` で認証状態を代用
- `authSession.ts`: メモリ変数 + sessionStorage の二段構えで Mock ユーザーを永続化（HMR リロード後も復元）
- `auth.ts` ハンドラ: stub-login / google/callback で `setMockAuthUser()` を呼ぶ
- `users.ts` / `settings.ts` ハンドラ: `getMockAuthUser()` が null なら 401 を返す（Cookie ガードの代用）
- `authSession.test.ts` で保存・復元・リセット・破損JSON の4パターンを単体テスト

## E2E 認証フィクスチャパターン（TCH-75）

- `e2e/fixtures/auth.ts` が `E2E_USE_MSW` フラグで MSW モード / 実 API モードを分岐
- MSW モード: `page.evaluate` 内から `/api/auth/stub-login` を fetch → `setMockAuthUser` が sessionStorage まで永続化（フィクスチャ側の手動 setItem は不要）
- 実 API モード: `page.request.post(stub-login URL)` で backend が Set-Cookie → cookie jar に保存 → 以後の fetch で自動送信
- `gotoAuthenticatedRoot`: `/api/users/me` レスポンスを waitForResponse してから `use(page)` に進み race condition を防ぐ
- Bearer 注入用 `apiAuth` フィクスチャは削除済み
