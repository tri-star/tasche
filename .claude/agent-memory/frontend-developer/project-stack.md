---
name: プロジェクト技術スタック
description: Tasche フロントエンドの主要ライブラリ・ツール・規約まとめ
type: project
---

## フレームワーク・ライブラリ
- React 19.2 + TypeScript 7.0.2（TCH-96でネイティブ〈Go製〉コンパイラの7系へ更新。`typescript` はバージョン完全固定）
- Vite 8 + vitest 4
- react-router-dom v7（createBrowserRouter / RouterProvider パターン）
- Jotai 2（状態管理、atomWithStorage は使わない方針）
- @tanstack/react-query 5（プロバイダのみセットアップ、クエリは後続タスク）
- oauth4webapi 3（PKCE/state 生成）
- Tailwind CSS 3.4 + tailwindcss-animate + shadcn/ui コンポーネント
- Biome（lint + format）
- MSW 2（API モック）
- orval 8（OpenAPI → クライアント生成、mutatorオプションでauthFetch統合）

## 重要ファイルパス
- `src/auth/` — 認証関連ユーティリティ（atoms, pkce, storage, authClient, authFetch, useAuth, useBootstrapAuth）
- `src/components/login/` — ログインUI（LoginLayout, LoginBackground, TascheLogo, GoogleLoginButton, StubLoginButton, LoginFooter）
- `src/components/routing/ProtectedRoute.tsx` — 認証ガード
- `src/router.tsx` — ルート定義（createBrowserRouter）
- `src/mocks/handlers/` — MSWハンドラ（auth.ts, users.ts, dashboard.ts, goals.ts）
- `src/test/setup.ts` — テストセットアップ（MSW server の beforeAll/afterEach/afterAll）
- `vitest.config.ts` — environment: jsdom, setupFiles: setup.ts

## 規約
- import エイリアス: `@/` = `src/`
- ファイル命名: コンポーネントは PascalCase、ユーティリティは camelCase
- テストファイル: 同ディレクトリに `*.test.tsx` / `*.test.ts`
- E2E テスト: `*.e2e.spec.ts`（vitest の exclude に含まれる）
- CSS: ログインページ専用は `tasche.*` Tailwindトークン、アプリ本体は shadcn CSS変数（primary等）
- @fontsource パッケージでNoto Sans JP / Quicksand を読み込む（WOFFファイルをコミットしない）
- SVGは `public/images/` 配下に置いて絶対パス `/images/...` で参照（import 不要）

## 認証アーキテクチャ
- accessToken はメモリのみ（Jotai atom、永続化しない）
- refreshToken は backend が HttpOnly Cookie で管理
- PKCE の code_verifier / state は sessionStorage（タブ閉じで消える）
- AuthClient シングルトン（authClientSingleton.ts）が orval mutator として全 API に認証ヘッダ付与

## テスト環境の注意
- oauth4webapi は `// @vitest-environment node` が必要（jsdomでSubtleCryptoエラー）
- react-router v7 のリダイレクトテストは `MemoryRouter + Routes + Route` を使う（createMemoryRouterではAbortSignal問題が起きる）

## TypeScript 7 移行の注意（TCH-96）
- TS7で `tsconfig.*.json` の `baseUrl` オプションが削除された。`baseUrl` なしで `paths` を使う場合、値は相対パス表記（先頭 `./`）が必須になり、`"@/*": ["src/*"]` のような非相対パスは `TS5090: Non-relative paths are not allowed` エラーになる。`"@/*": ["./src/*"]` のように修正する。
- `pnpm-workspace.yaml` の `minimumReleaseAge`（公開2日保留設定）はTS7.0.2アップデート時には引っかからなかった（公開から2日以上経過していたため）。もし将来別バージョンで引っかかる場合はプランどおり待つか一時回避（レビュー合意必須）。
- `typedoc`（orvalの間接依存）はTS7.0.2をpeer dependencyとしてまだ許容していないため `pnpm install` 時に警告が出るが、ビルド・型チェック・テストには実害なし。無視してよい。
- 効果: `tsc -b --force` 単体で約80%以上の高速化を確認（ネイティブGoコンパイラの恩恵）。`vite build` フェーズはTSバージョン非依存のためほぼ不変。
