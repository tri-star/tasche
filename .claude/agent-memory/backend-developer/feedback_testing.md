---
name: テスト実装のパターンと注意事項
description: pytest + PostgreSQL + respx + httpx テストの実装パターンと注意点
metadata:
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

## テスト DB は PostgreSQL tasche_test のみ（SQLite 廃止）

TCH-61 で SQLite in-memory（aiosqlite）は廃止。テストは PostgreSQL の `tasche_test` DB に一本化。

- conftest は `src/tasche/conftest.py` 1つのみ（SQLite版 `src/tasche/tests/conftest.py` は削除済み）
- セッション開始時に `alembic upgrade head` を自動適用（conftest の `_apply_migrations` fixture）
- 各テスト前に `alembic_version` 除く全テーブルを `TRUNCATE ... RESTART IDENTITY CASCADE`
- `TEST_DATABASE_URL` のDB名が `tasche_test` でなければ RuntimeError で pytest が起動前に失敗する

**Why:** SQLiteとPostgreSQLの挙動差異（外部キー制約、datetime timezone等）によるテスト誤検知を防ぐ。

**How to apply:** テスト実行は `docker compose exec api uv run pytest`。ホストから直接実行する場合は `TEST_DATABASE_URL=...tasche_test` を指定する。WSL2サンドボックスでは localhost:4102（Dockerポート）に直接接続できないため、コンテナ内実行が必要。

## PostgreSQL外部キー制約: user/taskの挿入順序

SQLiteでは外部キーが無効のため `db_session.add_all([user, task])` で通ったが、PostgreSQLでは失敗する。
`user_id` が文字列参照の場合、SQLAlchemyはORMリレーション依存を認識できず挿入順序が不定になる。

**Why:** PostgreSQLは外部キー制約が常に有効。

**How to apply:** 依存元（users）を先に `commit` してから依存先（tasks, weeks）を追加すること。

## テストのコロケーション配置

TCH-61 以降、テストはコロケーション配置を採用:
- `api/v1/tests/` - API テスト
- `core/tests/` - core ユニットテスト
- `services/tests/` - services 統合テスト
- `tests/` - main.py 等（test_main_telemetry.py）

pyproject.toml の `testpaths` にこれら4ディレクトリを明示。`api/v1/test_auth.py`（ルーター）は testpaths 外のため収集されない。

## session スコープ async engine で RuntimeError

Python 3.12 + pytest-asyncio `asyncio_default_fixture_loop_scope=function` で session スコープ async fixture の teardown に `asyncio.get_event_loop().run_until_complete()` を使うと RuntimeError になる。

**Why:** Python 3.12 でのイベントループ管理変更。function スコープのループが teardown 時には存在しない。

**How to apply:** engine は function スコープのまま毎テスト生成・破棄する方が安全。速度より安定性を優先。

## TestTokenService 認証はjwt_secretと揃える必要がある

`TestTokenService` は `settings.test_jwt_secret` でJWTを発行する。
compose.yaml で `TEST_JWT_SECRET=${JWT_SECRET:-...}` として jwt_secret と同じ値に設定しないと401になる。
config.py に `enable_test_auth: bool = False` / `test_jwt_secret: str` フィールドの追加も必要。

**Why:** TestTokenServiceが発行したトークンをAPIのJWT検証（jwt_secretでdecode）が検証できるようにするため。

**How to apply:** compose.yaml のapiサービスに ENABLE_TEST_AUTH=true と TEST_JWT_SECRET を設定する。
