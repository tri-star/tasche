---
name: Sentry導入パターン
description: TCH-81で確立したfrontendのSentry(@sentry/react)導入パターン。DSN未設定時no-op、ルート/Reactツリー両方のエラー捕捉
metadata:
  type: project
---

## 構成（TCH-81で確立、レビュー指摘反映済み）

- `src/lib/sentry.ts` — `initSentry()`。`VITE_SENTRY_DSN` 未設定なら即return（no-op）。設定時のみ `Sentry.init` を呼ぶ。
  - `environment`: `VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE`
  - `tracesSampleRate`: 正規表現 `^-?\d+(\.\d+)?$` で文字列全体が数値表現か検証してから `Number()` 変換し、`0〜1`の範囲外・NaNは`0`にフォールバック。`Number.parseFloat`は`"0.5abc"`のような部分一致を許してしまうため使わない。
  - integration には非推奨の `reactRouterV7BrowserTracingIntegration` ではなく `Sentry.reactRouterBrowserTracingIntegration({ useEffect, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes })` を使う（シグネチャ互換、react-router v6+対応の後継API）。
  - `beforeSend` / `beforeBreadcrumb` で `event.request.url` / `breadcrumbs[].data.url` 中の `code`/`state` クエリパラメータを `[Filtered]` にマスクする（OAuthコールバック `/auth/callback?code=...&state=...` のURLがSentryに漏洩するのを防止）。`new URL(url, "http://dummy")` でパースし絶対/相対を判定して復元する実装（`maskSensitiveQueryParams`）。
- `main.tsx` — モジュールトップレベル（`createRoot`より前）で `initSentry()` を1回だけ呼ぶ。StrictModeの二重実行対策としてコンポーネント内では呼ばない。
- `main.tsx` — プロバイダーツリー全体を `<Sentry.ErrorBoundary fallback={<AppErrorFallback />}>` でラップ（ルーター外の描画エラー捕捉用）。
- `router.tsx` — `Sentry.wrapCreateBrowserRouter(createBrowserRouter)`（非推奨の`wrapCreateBrowserRouterV7`ではなく後継API、シグネチャ互換）でラップし、ルート配列をpathlessな `{ errorElement: <RootErrorBoundary />, children: [...既存ルート] }` で包む。既存の各ルートの path/element は変更不要（pathlessレイアウトルートは自動で `<Outlet/>` を描画）。
- `components/routing/RootErrorBoundary.tsx` — `useRouteError()` + `useEffect(() => Sentry.captureException(error), [error])` + `<AppErrorFallback />`。`createBrowserRouter` のerrorElementはRouterProvider外のErrorBoundaryに伝播しないため、ここで明示的にcaptureExceptionが必要。
- `components/common/AppErrorFallback.tsx` — 共通フォールバックUI（`ProtectedRoute` の `FullscreenSpinner` と同様のフルスクリーンレイアウト + `Button` + 日本語メッセージ）。`RootErrorBoundary` と `main.tsx` の両方から使う。`onReload`のようなprops化はYAGNI違反として指摘され削除済み（呼び出し元が無いなら常に`window.location.reload()`を直接呼ぶ）。

## テストパターン（sentry.test.ts）

- `vi.mock("@sentry/react", () => ({ init: (...args) => sentryInitMock(...args), reactRouterV7BrowserTracingIntegration: vi.fn(...) }))` で外部変数パターンのモック（[[testing-patterns]]参照）。
- `vi.stubEnv(...)` + `afterEach` で `vi.unstubAllEnvs()` + `vi.resetModules()`。
- 動的import (`await import("./sentry")`) をテストごとに行うことで `import.meta.env` のstubを安定させる（モジュールトップレベルで環境変数を読むため）。

## 依存バージョン

`@sentry/react` はpnpm解決で `^10.65.0`（v10系）。`wrapCreateBrowserRouter` / `reactRouterBrowserTracingIntegration`（非V7サフィックス版）もこのバージョンに含まれる。`*V7`サフィックス版は `@deprecated`（`Use wrapCreateBrowserRouter instead.` 等のJSDoc）なので新規実装では使わない。

## 注意点

- DSN未設定時は `Sentry.captureException` 等も安全にno-opで呼べる（テスト環境のMSW `onUnhandledRequest: "error"` に抵触しない）。
- `import.meta.env` の型は `vite/client` の `ImportMetaEnv` に `[key: string]: any` のインデックスシグネチャがあるため、`VITE_SENTRY_*` 等の独自env varは型宣言追加なしでもtsc通過する。
- READMEで`.env.dev`/`.env.prod`を「未コミット」と書くのは誤り（`.gitignore`は`.env`/`.env.local`のみ対象、`.env.dev`/`.env.prod`はコミットされる）。DSN等の公開前提の値のみ書き、秘密情報はCI/デプロイ環境変数を使う旨を明記すること。
- `vi.mock`ファクトリ内で外部の`vi.fn()`変数をそのまま参照するとhoisting問題を起こす場合があるため、`(...args) => mockFn(...args)`のラッパー越しに呼ぶ（[[testing-patterns]]参照）。ただし`(...args: unknown[])`を関数シグネチャの決まった関数へそのままspreadするとtscの`A spread argument must either have a tuple type...`エラーになるので、単一引数を明示的に受け渡す（例: `(options: unknown) => mockFn(options)`）。
