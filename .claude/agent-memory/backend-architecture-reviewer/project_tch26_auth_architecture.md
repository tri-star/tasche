---
name: TCH-26 認証アーキテクチャの設計決定
description: BFF型 Google OAuth 2.0 認証（FastAPI + Authlib + joserfc）の主要設計決定と確認済みパターン
type: project
---

BFF 型 Google OAuth 2.0 認証を実装（TCH-26）。FastAPI + Authlib + python-jose + SQLAlchemy (async)。

主な設計決定:
- フロントエンド → バックエンドが code + code_verifier を受け取り Google と交換する BFF 型
- 自前 JWT (HS256, 15分) + 不透明 Refresh Token (DB 管理, HttpOnly Cookie, ローテーション)
- `is_auth_stub_enabled()` が本番安全性ゲート（APP_ENV=production で強制 false）
- スタブ JWT には `stub: True` クレームを付けて本番 JWT と識別
- ULID に `usr_` / `rft_` prefix を付けてエンティティ ID に使用（String(30) に収まる設計）
- Refresh Token: 生トークン非保存 (SHA-256 ハッシュのみ DB 保存)、再利用検知時に全トークン一斉 revoke
- `rotated_from_id` / `rotated_to_id` で双方向ローテーション連鎖を記録

**Why:** セキュリティ要件（HttpOnly Cookie, PKCE, トークン再利用検知）と MVP のシンプルさのバランスを取った設計。

**How to apply:** 今後の認証関連変更では上記パターンを尊重する。スタブ認証の追加は必ず is_auth_stub_enabled() ガードを通すこと。

既知の問題（レビューで指摘）:
- ~~services/user.py の create_user / update_user 内に db.commit() があり~~→ TCH-32 で修正済み（flush のみに変更）
- ~~core/oauth.py の JWKS キャッシュがモジュール変数で asyncio.Lock なし~~→ TCH-26 で asyncio.Lock + double-checked locking 実装済み
- cookie.py の REFRESH_TOKEN_MAX_AGE が config.py の jwt_refresh_token_expires_seconds と二重管理
- get_or_create_user_by_google_sub が lookup→insert パターンで UniqueViolation を未ハンドル（TCH-32 でも未修正）

TCH-32 追加情報:
- email_verified_at カラム追加（Google 自動紐付けのセキュリティ修正）
- InvalidAuthorizationCodeError を「未検証メール紐付け拒否」に流用している（Warning 指摘済み。専用例外 GoogleAccountAlreadyLinkedError / UnverifiedEmailAutoLinkError 追加を推奨）
- email_verified_at は再ログインのたびに上書きされる（初回検証日時ではなく最終検証日時として機能）
- migrations/versions/ は git 追跡対象外（.gitkeep のみ）。バックフィル戦略の検証不可

TCH-29 追加情報 (authlib.jose → joserfc 移行):
- verify_google_id_token() は joserfc の推奨 API (KeySet → jwt.decode → JWTClaimsRegistry) に正確に沿っている
- authlib は AsyncOAuth2Client (トークン交換) のために継続使用。JOSE/JWT 処理は joserfc に移行済み
- python-jose は tests/helpers/google_oauth.py でのみ使用。本番コードでは不要（脆弱性リスク: CVE-2024-33663）
- verify_google_id_token() 内の JoseError が oauth.py → auth.py を跨いで露出している（auth.py で catch して InvalidAuthorizationCodeError に変換している）
- email_not_verified を JoseError("email_not_verified") で raise しているのはビジネスルール例外の流用（InvalidAuthorizationCodeError を直接 raise すべき）
