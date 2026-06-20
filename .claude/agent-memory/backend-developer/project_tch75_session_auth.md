---
name: tch75-session-auth
description: TCH-75でJWT+リフレッシュトークンからサーバ側セッション方式に移行した設計判断と技術詳細
metadata:
  type: project
---

## TCH-75: 認証方式をサーバ側セッション方式へ移行（2026-06-20 完了）

JWT + リフレッシュトークン方式を廃止し、DB の sessions テーブルを真実とする不透明トークン（session Cookie）方式に移行した。

**Why:** セキュリティ強化と実装シンプル化。JWT は stateless だが revoke が困難。sessions テーブルで即時 revoke が可能になる。

**How to apply:** セッション関連の実装は `services/session.py` と `core/security.py` に集約。新しい認証が必要な機能は `get_current_user_sub` を Depends で使う。

## セッション実装の概要

- トークン: `secrets.token_urlsafe(48)` の不透明トークン（生値は Cookie にのみ存在）
- DB 保存: SHA-256 ハッシュ（`token_hash` カラム 64 文字）
- Cookie: `session=<opaque>; HttpOnly; Secure(prod); SameSite=Lax; Path=/api; Max-Age=604800`
- スライディング延長: 残存時間 < SESSION_EXPIRES_SECONDS/2 の時に自動延長（validate_session が `(Session, bool)` を返す）
- セッション ID: `ses_{ULID}` 形式（30文字以内）

## 廃止されたもの

- `models/refresh_token.py` → 削除
- `core/security.py` の JWT 関数群 (`issue_access_token`, `_decode_app_jwt` 等)
- `services/auth.py` の `rotate_refresh_token`, `revoke_refresh_token`
- `schemas/auth.py` の `TokenResponse`
- `/api/auth/refresh` エンドポイント
- config の `jwt_secret`, `jwt_algorithm`, `jwt_access_token_expires_seconds`, `jwt_refresh_token_expires_seconds`, `auth_stub_jwt_secret`, `test_jwt_secret`
- `core/test_auth.py` の `TestTokenService`

## 新設されたもの

- `models/session.py` - Session モデル (sessions テーブル)
- `services/session.py` - create_session / validate_session / revoke_session
- `core/csrf.py` - CSRFMiddleware (Origin/Referer 検証; 双方なければパススルー)
- `core/test_auth.py` の `create_test_session(db, user) -> str`
- config の `session_expires_seconds: int = 604800`

## 循環インポート回避策

`core/security.py` が `get_db` を使う際は `api/deps.py` を経由せず `tasche.db.session` から直接 import。
（`api` → `core` の逆方向参照を避けるため）

## 関連ファイル

- [[feedback_testing]] - auth_cookies fixture の使い方
