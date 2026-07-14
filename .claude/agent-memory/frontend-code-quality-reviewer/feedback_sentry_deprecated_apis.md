---
name: feedback_sentry_deprecated_apis
description: TCH-81でSentry導入時、@sentry/reactのバージョン別(V7)APIではなく非バージョン(compat)APIを使うべき
type: feedback
---

TCH-81 (Sentry導入) のレビューで、`packages/frontend/src/router.tsx` と `packages/frontend/src/lib/sentry.ts` が
`Sentry.wrapCreateBrowserRouterV7` / `Sentry.reactRouterV7BrowserTracingIntegration` を使用していたが、
インストールされている `@sentry/react@^10.65.0` ではこれらはいずれも `@deprecated` 指定されており、
非バージョン付きの `wrapCreateBrowserRouter` / `reactRouterBrowserTracingIntegration`
（`reactrouter.compat.d.ts` 由来、React Router v6+ 対応、シグネチャ互換）への置き換えが推奨されている。

**Why:** JSDoc `@deprecated` は Biome/tsc の標準ルールでは検出されない（strikethroughはIDE表示のみ）ため、
コードレビューで明示的に node_modules の型定義を確認しないと見逃す。SDKの将来のメジャーバージョンで
V7専用APIが削除されるリスクがある。

**How to apply:** `@sentry/react` を使うコード（router連携、init設定）をレビューする際は、
`node_modules/@sentry/react/build/types/` 配下で使用しているエクスポートに `@deprecated` 注記がないか
grepで確認し、あれば非バージョン付きAPIへの置き換えを提案する。関連: [[feedback_bootstrap_hook_test_coverage]]
