---
name: project-tch75-auth-session-migration
description: TCH-75 認証方式刷新（JWT廃止→Cookie HttpOnly セッション方式）のフロントエンド実装とセキュリティレビュー済み知見
metadata:
  type: project
---

TCH-75 にてフロントエンド認証方式を JWT/accessTokenAtom 管理から Cookie HttpOnly (credentials:"include") に刷新。コミット `52cff69`。

**Why:** アクセストークンの localStorage 保管を廃止し XSS 耐性を向上させるため。

**How to apply:** 以降の PR で auth 関連コードを触る場合、以下の済み事項と未解決事項を踏まえること。

## レビューで確認済みの設計

- `accessTokenAtom` 削除・Authorization ヘッダ注入完全撤廃済み
- PKCE (S256) は oauth4webapi で生成、sessionStorage に TTL 10分で保存
- state 検証あり（callback で pending.state !== returnedState をチェック）
- ProtectedRoute が全保護ルートをカバー
- MSW/stub-login は DEV ガード + .env.prod で false 設定済み

## 未解決・要対応

- **High**: `state` をバックエンドから受け取る設計（pkce.ts に createState() あるが未使用）。RFC 推奨はフロント生成。
- **Medium**: AuthCallbackPage で Error.message をそのまま画面表示（固定文言に変えるべき）
- **Medium**: window.location.assign(authorizationUrl) のオリジン検証なし（バックエンドは accounts.google.com 固定だが多層防御なし）
