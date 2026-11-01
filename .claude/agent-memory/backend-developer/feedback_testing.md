---
name: テスト実装のパターンと注意事項
description: pytest + PostgreSQL + respx + httpx テストの実装パターンと注意点、Docker環境でのテスト実行前セットアップ手順
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

## joserfc は exp クレームを decode 時に自動検証しない

`jwt.decode(token, key)` だけでは `exp` の期限切れチェックは行われない。
python-jose の `jwt.decode()` は自動検証していたが、joserfc は明示的な検証が必要。

**Why:** joserfc の設計方針として claims 検証はデコードと分離されている。

**How to apply:** デコード後に必ず `JWTClaimsRegistry(exp={"essential": True}).validate(decoded.claims)` を呼ぶ。
RS256 の Google ID Token 検証でも同様（`verify_google_id_token()` 内の `JWTClaimsRegistry` でまとめて検証）。

## TestTokenService は廃止、auth_cookies fixture を使う（TCH-75で変更）

TCH-75 以降、JWT + TestTokenService 方式は廃止。テスト認証は `create_test_session(db, user)` が返す生トークンを `cookies={"session": raw_token}` で渡す方式に統一。

- `conftest.py` の `auth_cookies` fixture が `create_test_session` をラップしている
- `await auth_cookies(user)` が `{"session": "<raw_token>"}` 辞書を返す
- httpx の `client.get(url, cookies=cookies)` に渡す

**Why:** サーバ側セッション方式に移行したため JWT 不要に。

**How to apply:** 全テストで `auth_headers` → `auth_cookies`, `headers={"Authorization": ...}` → `cookies=await auth_cookies(user)` に置き換える。無効トークンテストは `cookies={"session": "invalid_session_token"}`。

## pytest がソースファイルの Exception クラスを誤収集する警告

ファイル名が `test_*.py` の場合、そのファイル内の全クラスが pytest のスキャン対象になる。
`Test` から始まるクラス名（または `__init__` を持つクラス）で PytestCollectionWarning が出る。

**Why:** pytest のファイル名ベース収集と命名規則の衝突。

**How to apply:** 実装クラスを `test_*.py` ファイルに置くのは避ける。やむを得ない場合はクラス名が `Test` で始まらないようにする（例: `TestAuthDisabledError` → `SessionAuthDisabledError`）。テストには実害なし。

## ローカル Docker 環境でのテスト実行前セットアップ（TCH-62 で判明）

`packages/backend` に `.env` が存在しない状態で `docker compose up -d` すると、`api` サービスは `DATABASE_URL` 未設定で `Settings()` 初期化に失敗する（`TEST_DATABASE_URL` は compose.yaml にハードコードされているが `DATABASE_URL` は `.env` 経由必須）。また `Dockerfile.dev` は `uv pip install --system -e ".[dev]"` でシステム Python に依存関係を入れる方式のため、コンテナ内で素朴に `uv run pytest` すると uv が独自に `.venv` を作ってしまい、システムインストール済みパッケージ（authlib, joserfc, aws-opentelemetry-distro 等）が `.venv` に反映されず `ModuleNotFoundError` になることがある。

**Why:** `.env` は gitignore 対象で環境依存のため常には存在しない。`Dockerfile.dev` のインストール方式（system installs）と `uv run` の venv 自動作成方式が噛み合っていない。

**How to apply:**
1. `packages/backend/.env.example` を元に `.env` を作成する。
2. `.env` 作成/変更後は `docker compose restart api` では反映されない。`docker compose up -d --force-recreate api` で作り直す必要がある。
3. `uv run pytest` 実行時に `ModuleNotFoundError` が出たら `uv sync --extra dev` に加え、不足パッケージ（authlib / joserfc / itsdangerous / aws-opentelemetry-distro / opentelemetry-instrumentation-fastapi / opentelemetry-instrumentation-logging / respx 等）を `uv pip install <パッケージ名...>` で個別に `.venv` へ追加する。
4. `scripts/generate-openapi.sh` は内部で旧 `docker-compose` CLI を呼んでおり `~/.docker/config.json` の権限問題で失敗することがある。その場合は `docker compose exec -T api-e2e python scripts/generate_openapi.py` を直接実行する（`api-e2e` サービスは `DATABASE_URL` が compose.yaml にハードコードされているため `.env` 不備の影響を受けない）。
