---
name: project-tch81-sentry-integration
description: TCH-81 Sentry(@sentry/react)導入のセキュリティレビュー済み知見。DSN設定・PII設定・OAuthコールバックURL漏洩リスク
metadata:
  type: project
---

TCH-81 で `packages/frontend` に `@sentry/react@10.65.0` を導入（`src/lib/sentry.ts`, `AppErrorFallback.tsx`, `RootErrorBoundary.tsx`）。

**Why:** 未捕捉エラーの監視のため。DSN未設定時はno-opになる設計で、ローカル/テストへの誤送信は防止されている。

**How to apply:** 以降 Sentry 関連コードや `auth/AuthCallbackPage` 周りを触るPRをレビューする際、以下を踏まえること。

## レビューで確認済みの設計（問題なし）

- `Sentry.init` に `sendDefaultPii` を明示していない → SDK既定値 `false` で安全（IP・cookie等を自動送信しない）
- `Sentry.setUser` / `setContext` 等のPII付与コードなし
- DSNは `.env.example` 上は空文字、`.env.dev`/`.env.prod`（このPR時点)にもDSN値は追加されておらず、実DSNの平文コミットは未確認
- `AppErrorFallback` はスタックトレース等の詳細を表示せず、固定文言のみ
- Sentry未初期化時 `captureException`/`ErrorBoundary` は安全にno-op（テストで確認済み）
- Replay/Feedback統合はバンドルには含まれる(依存経由)が `integrations` に明示追加されておらずセッションリプレイは動作しない

## 指摘済み・未解決の懸念

- **High（要確認）**: `beforeSend` 等のURLスクラビングが一切ない。[[project-tch75-auth-session-migration]] にある通り `/auth/callback?code=...&state=...` に Google の認可コード/stateが平文で載る。Sentryはデフォルトで発生時の `window.location.href` をイベントに付与するため、そのページ滞在中に何らかの未処理例外/Promise rejectionが発生すると、認可コード・stateがSentry（サードパーティ）に送信される可能性がある。`beforeSend`/`beforeBreadcrumb` でクエリパラメータ（code, state等）を redact するフックの追加を推奨。
- **Medium**: `README.md` に「`.env.dev` / `.env.prod`（未コミット）」という記載を追加しているが、実際は `git ls-files` で追跡されておりコミット済みファイル（`.gitignore` は `.env`/`.env.local` のみ対象で `.env.dev`/`.env.prod` は対象外）。DSN自体は公開前提の値なので実害は小さいが、将来このコメントを信じて真の秘密情報を書き込まれるリスクがある。ドキュメント修正を推奨。
