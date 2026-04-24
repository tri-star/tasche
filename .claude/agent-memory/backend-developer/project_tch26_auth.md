---
name: TCH-26 Google OAuth 2.0 認証実装
description: Google OAuth 2.0（BFF型+PKCE）認証の実装知見と落とし穴
type: project
---

TCH-26 にて Auth0 認証を Google OAuth 2.0 直接連携（BFF 型 + PKCE）に完全差し替えた。

**Why:** Auth0 依存を除去し、Google 直連携により認証コストを削減。frontend が code/code_verifier を生成し、backend が Google /token にリクエストする BFF パターン。

**How to apply:** 今後の認証拡張（例: 他 OAuth プロバイダ追加）は同様のパターンで `core/oauth.py` に関数を追加する形で実装する。

## 重要な設計判断

1. `is_auth_stub_enabled(app_env, auth_stub_enabled)` - production では常に False。全参照箇所でこの関数を経由すること。
2. stub-login は `if is_auth_stub_enabled(...):` によるルーター登録時の条件分岐（path guard ではない）
3. Refresh Token: raw を DB に保存しない（SHA-256 ハッシュのみ）
4. エラーレスポンス: `{"error": {"code": ..., "message": ...}}` 形式（旧 `{"code": ..., "message": ...}` から変更）

## 落とし穴

- `python-ulid` パッケージは `from ulid import ULID` でインポート（`from python_ulid import ULID` ではない）
- SQLite テストでは `expires_at.tzinfo is None` のケースを考慮する必要がある
- httpx 0.28 では `ASGITransport` を使う: `AsyncClient(transport=ASGITransport(app=app), ...)`
- Pydantic Settings の `@property` は `patch.object` で上書き不可。基底フィールドを mock する

## ファイル構成（認証関連）

- `core/config.py` - Settings（Google OAuth, JWT, Cookie, Auth Stub）
- `core/env.py` - `is_auth_stub_enabled`, `is_production`
- `core/oauth.py` - Google OAuth クライアント（JWKS TTL キャッシュ付き）
- `core/security.py` - JWT 発行・検証（自前 JWT + スタブ JWT フォールバック）
- `core/cookies.py` - Refresh Token Cookie ユーティリティ
- `services/auth.py` - OAuth フロー全体のオーケストレーション
- `services/user.py` - `get_or_create_user_by_google_sub`, `get_or_create_user_by_email`
- `api/v1/auth.py` - 5 エンドポイント（stub-login は条件付き登録）
- `models/refresh_token.py` - RefreshToken ORM モデル
- `models/user.py` - `google_sub` カラム追加
