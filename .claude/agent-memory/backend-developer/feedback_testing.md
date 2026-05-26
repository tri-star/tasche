---
name: テスト実装のパターンと注意事項
description: pytest + SQLite in-memory + respx + httpx テストの実装パターン
type: feedback
---

## httpx 0.28 の ASGI テストクライアント

旧形式 `AsyncClient(app=app, base_url="http://test")` は 0.28 で廃止。
新形式: `AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`

**Why:** httpx の API 変更。pytest でエラーになる。

**How to apply:** テストの conftest.py で必ず ASGITransport を使う。

## Pydantic Settings の @property は mock 不可

`patch.object(settings, "google_oauth_redirect_uri_list", [...])` は AttributeError。
代わりに基底フィールド `patch.object(settings, "google_oauth_redirect_uris", "uri1,uri2")` を mock する。

**Why:** Pydantic v2 の property は setter/deleter が設定されていない。

**How to apply:** 設定プロパティのテストでは基底フィールドを mock する。

## SQLite と timezone-aware datetime の不整合

SQLite + `DateTime(timezone=True)` でも naive datetime が返ることがある。
`if expires_at.tzinfo is None: expires_at = expires_at.replace(tzinfo=timezone.utc)` で対処。

**Why:** SQLite は timezone を持たないため、SQLAlchemy が naive datetime を返す場合がある。

**How to apply:** datetime 比較を行うサービス層では必ずこのチェックを入れる（特に SQLite テスト環境で問題が出る）。

## src/tasche/api/v1/tests/ のテストはPostgreSQLを使う

`src/tasche/api/v1/tests/` 配下のテストは `src/tasche/conftest.py`（PostgreSQL接続）のfixtureを使う。
`src/tasche/tests/conftest.py`（SQLite in-memory）ではない点に注意。

モデルにカラムを追加した場合はテストDBを手動再作成する必要がある（create_allは既存テーブルを変更しないため）。

**Why:** conftest.py の解決は pytest の conftest 検索パスによるもの。api/v1/tests/ の親ディレクトリに conftest.py が存在するため。

**How to apply:** モデル変更後のテスト実行前にテストDB再作成スクリプトを実行する。

## TestTokenService 認証はjwt_secretと揃える必要がある

`src/tasche/api/v1/tests/` の TestTokenService は `settings.test_jwt_secret` でJWTを発行する。
compose.yaml で `TEST_JWT_SECRET=${JWT_SECRET:-...}` として jwt_secret と同じ値に設定しないと401になる。
また config.py に `enable_test_auth: bool = False` / `test_jwt_secret: str` フィールドの追加も必要。

**Why:** TestTokenServiceが発行したトークンをAPIのJWT検証（jwt_secretでdecode）が検証できるようにするため。

**How to apply:** compose.yaml のapiサービスに ENABLE_TEST_AUTH=true と TEST_JWT_SECRET を設定する。
