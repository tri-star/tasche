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
