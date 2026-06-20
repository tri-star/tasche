---
name: TCH-26/75 認証アーキテクチャの設計決定
description: BFF型Google OAuth 2.0 認証の設計決定。TCH-75でJWT+Refresh Token方式→サーバ側セッション方式に移行済み。
type: project
---

BFF 型 Google OAuth 2.0 認証を実装（TCH-26）。FastAPI + Authlib + joserfc + SQLAlchemy (async)。

## TCH-75 で確定した現行アーキテクチャ（サーバ側セッション方式）

- 不透明セッショントークン（`secrets.token_urlsafe(48)`）を Cookie に保存
- DB には SHA-256 ハッシュ（hex 64文字）のみ保存（`sessions` テーブル）
- セッション ID は `ses_` + ULID（String(30)）
- スライディング延長: 残存 < 有効期限の半分 → `expires_at` を延長（毎リクエスト DB 書き込みなし）
- `revoked_at` カラムで revoke を記録。logout は冪等（Cookie 無しでも 200）
- `session_expires_seconds` = 604800（7日）を `config.py` で一元管理

## TCH-75 以前（廃止）

~~自前 JWT (HS256, 15分) + 不透明 Refresh Token (DB 管理, HttpOnly Cookie, ローテーション)~~
→ JWT・Refresh Token 関連のコード・設定・テストはすべて削除済み

## 認証フローの核心ファイル

- `core/security.py`: `get_current_user_sub` (Cookie → DB 照合 → user_id 返却・スライディング延長)
- `services/session.py`: `create_session` / `validate_session` / `revoke_session`
- `models/session.py`: `sessions` テーブル定義
- `core/csrf.py`: Origin/Referer 検証ミドルウェア（POST/PUT/PATCH/DELETE の `/api/*` に適用）
- `api/v1/auth.py`: `/google/authorize`, `/google/callback`, `/logout`, `/stub-login`（条件登録）
- `core/cookies.py`: `set_session_cookie` / `clear_session_cookie`（`/api` path、HttpOnly）

## DI パターン（api/deps.py）

```python
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserSub = Annotated[str, Depends(get_current_user_sub)]
CurrentUser = Annotated[User, Depends(get_current_user)]
```

型エイリアスにより、認証方式変更が全保護 API に自動波及する設計。

## CSRF ミドルウェア登録順

`main.py` での登録順: CORS（外）→ CSRF（内）
- Origin/Referer が両方ない場合は pass-through（SameSite=Lax が一次防御の前提）
- 拒否時: 403 + `{"error": {"code": "CSRF_VALIDATION_FAILED", ...}}`

## スタブ認証

- `is_auth_stub_enabled(app_env, auth_stub_enabled)` でゲート制御
- APP_ENV=production では強制 false
- スタブ: モジュールロード時に条件登録（`if is_auth_stub_enabled(...): @router.post("/stub-login")`）
- テスト用: `core/test_auth.py` の `create_test_session`（`ENABLE_TEST_AUTH` ガード付き）

## 既知の問題・指摘事項

- **🔴 TCH-75 指摘（未修正）**: `validate_session`（line 102）と `revoke_session`（line 129）がサービス層で `db.commit()` を直接呼んでいる。規約（「commit は呼び出し側責任」）に違反。`db.flush()` に変更し、commit は呼び出し側に移譲すべき。
- **🟡 TCH-75 指摘（未修正）**: `csrf.py` の拒否レスポンスに入力値（`check_origin`）を動的に埋め込んでいる。固定文言 + サーバログに変更推奨。
- **🟡 TCH-75 指摘（未修正）**: `test_session_service.py` がプライベート関数 `_hash_token`, `_generate_raw_token`, `_generate_session_id` を直接 import。
- **継続指摘**: `InvalidAuthorizationCodeError` を「別のGoogleアカウント紐付け」「未検証メール紐付け拒否」に流用（専用例外追加推奨）。
- get_or_create_user_by_google_sub が lookup→insert パターンで UniqueViolation を未ハンドル（TCH-32 でも未修正）
- email_verified_at は再ログインのたびに上書きされる（初回検証日時ではなく最終検証日時として機能）
- migrations/versions/ は git 追跡対象外（.gitkeep のみ）。バックフィル戦略の検証不可

## テスト基盤（TCH-75 で確立）

- `conftest.py` の `auth_cookies` fixture: `create_test_session` でセッション発行（実 DB）
- `services/tests/test_session_service.py`: セッション CRUD + スライディング延長のユニットテスト
- `core/tests/test_security.py`: `get_current_user_sub` dependency のユニットテスト
- `api/v1/tests/test_auth.py`: Google OAuth / logout / stub-login の統合テスト

## TCH-29 追加情報 (authlib.jose → joserfc 移行: JWT時代の記録)

- verify_google_id_token() は joserfc の推奨 API を使用（現在も有効）
- authlib は AsyncOAuth2Client（トークン交換）のために継続使用
- python-jose は tests/helpers/google_oauth.py でのみ使用（CVE-2024-33663 リスク: 本番コードでは不使用）
