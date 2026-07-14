---
name: feedback_new_component_test_convention
description: このプロジェクトでは単純な表示専用コンポーネントにもテストを書く慣習がある（NoGoalsEmptyState, ProtectedRouteが前例）
type: project
---

`packages/frontend/src/components/dashboard/NoGoalsEmptyState.tsx`（単純な空状態表示）や
`packages/frontend/src/components/routing/ProtectedRoute.tsx`（authStatusによる分岐）には、
それぞれ対応する `.test.tsx` が存在し、ユーザー観点の振る舞い（表示テキスト・リダイレクト等）をテストしている。

TCH-81 (Sentry導入) では新規追加された `AppErrorFallback.tsx` と `RootErrorBoundary.tsx` に
テストファイルが存在しなかった（`sentry.ts` にはテストがあるが、これらコンポーネント側にはない）。

**Why:** プロジェクトの慣習として「単純に見えるコンポーネントでもテストを書く」があるため、
新規コンポーネント追加時にテスト有無を確認しないと一貫性が崩れる。特に RootErrorBoundary は
「createBrowserRouterのerrorElementはSentry.ErrorBoundaryへ伝播しないため、ここで明示的にcaptureExceptionを呼ぶ」
という設計判断そのものが、テストで固定化されていないと将来のリファクタで壊れやすい。

**How to apply:** 新規コンポーネント追加のレビューでは、同ディレクトリ内の類似コンポーネントに
テストファイルがあるか確認し、あれば「このコンポーネントにもテストがあるべきでは」と指摘する。
