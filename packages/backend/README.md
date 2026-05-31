# Tasche Backend API

Tasche MVP のバックエンド API（FastAPI + PostgreSQL）

## 技術スタック

- **Framework**: FastAPI
- **Package Manager**: uv
- **Linter/Formatter**: ruff
- **ORM**: SQLAlchemy (async)
- **Database**: PostgreSQL (Neon for production, Docker for local)
- **Authentication**: Google OAuth 2.0 (BFF型 + PKCE) / 自前発行 JWT (Authlib)
- **Migration**: Alembic
- **Local Development**: Docker Compose

## セットアップ

### 前提条件

- Docker & Docker Compose
- Python 3.12+
- uv (optional, Docker内で使用)

### ローカル開発環境の起動

```bash
# 環境変数ファイルを作成
cp .env.example .env

# Docker Compose でコンテナ起動
docker-compose up -d

# ログ確認
docker-compose logs -f api

# ヘルスチェック
# **正確なポート番号は .env の API_CONTAINER_PORT を確認**
curl http://localhost:8000/health

# Swagger UI
# **正確なポート番号は .env の API_CONTAINER_PORT を確認**
open http://localhost:8000/docs
```

### データベースマイグレーション

```bash
# マイグレーションファイル生成
docker-compose exec api alembic revision --autogenerate -m "description"

# マイグレーション実行
docker-compose exec api alembic upgrade head

# ロールバック
docker-compose exec api alembic downgrade -1
```

### データシーディング（開発用）

```bash
# テストデータを投入
docker-compose exec api python scripts/seed.py

# データベースをリセット（全データ削除）
docker-compose exec api python scripts/reset_db.py
```

## API仕様

**正確なポート番号は .env の API_CONTAINER_PORT を確認**

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: `openapi.json`

### OpenAPI定義の生成

フロントエンドとの連携用にOpenAPI定義をファイルに書き出します。

```bash
# シェルスクリプトで実行（推奨）
./scripts/generate-openapi.sh

# または直接Pythonスクリプトを実行
docker-compose exec api python scripts/generate_openapi.py
```

生成されたファイルは `openapi.json` に保存されます（volumeマウントで自動的にホスト側にも反映）。

## 開発

### コード変更

`src/tasche/` 配下のファイルを編集すると、ホットリロードで自動的に反映されます。

### テスト（pytest）

テストには PostgreSQL の `tasche_test` データベースが必要です。

```bash
# DB だけ起動（テスト実行時に必要）
docker compose -f packages/backend/compose.yaml up -d db

# コンテナ内でテスト実行（推奨）
docker compose -f packages/backend/compose.yaml exec api uv run pytest -q

# ホストから直接実行する場合（TEST_DATABASE_URL を tasche_test に向ける）
cd packages/backend
TEST_DATABASE_URL=postgresql+asyncpg://tasche:tasche_dev_password@localhost:<DB_PORT>/tasche_test uv run pytest -q

# 失敗したテストから詳細表示
docker compose -f packages/backend/compose.yaml exec api uv run pytest -x

# 特定のテストだけ実行（例）
docker compose -f packages/backend/compose.yaml exec api uv run pytest -k users
```

> **注意**: `TEST_DATABASE_URL` のDB名が `tasche_test` でない場合、テストは起動前に失敗します。開発DB `tasche` に対するマイグレーション・TRUNCATE は一切行われません。

### Lint / Format（ruff）

```bash
# Lint（チェックのみ）
docker-compose exec api ruff check .

# Lint（自動修正あり）
docker-compose exec api ruff check . --fix

# Format（整形）
docker-compose exec api ruff format .

# Format（チェックのみ）
docker-compose exec api ruff format . --check
```

### コンテナ再起動

```bash
docker-compose restart api
```

### クリーンアップ

```bash
# コンテナ停止
docker-compose down

# データベースも含めて削除
docker-compose down -v
```

## ディレクトリ構造

テストはコロケーション配置（各モジュールと同階層の `tests/` ディレクトリ）を採用しています。

```
packages/backend/
├── src/tasche/
│   ├── conftest.py          # pytest 共通 fixture（全テストで共有）
│   ├── api/
│   │   └── v1/
│   │       ├── tests/       # API テスト（コロケーション）
│   │       │   ├── test_auth.py
│   │       │   ├── test_users.py
│   │       │   ├── test_tasks.py
│   │       │   ├── test_settings.py
│   │       │   ├── test_records.py
│   │       │   ├── test_dashboard.py
│   │       │   └── test_goals.py
│   │       └── ...          # エンドポイント実装
│   ├── core/
│   │   └── tests/           # core ユニットテスト
│   ├── services/
│   │   └── tests/           # services テスト
│   └── tests/               # main.py 等のテスト（test_main_telemetry.py）
├── migrations/              # Alembic マイグレーション
└── pyproject.toml
```

## MVP 範囲

1. **Phase 1**: Docker起動、ヘルスチェック
2. **Phase 2**: DB接続、User モデル
3. **Phase 3**: テスト用JWT認証、`/api/users/me`
4. **Phase 4**: Google OAuth 2.0 認証（`/api/auth/google/authorize`, `/api/auth/google/callback`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/stub-login`）、Refresh Token Rotation

将来実装予定：

- タスクAPI (`/api/tasks`)
- 週API (`/api/weeks/current`)
- 目標API (`/api/weeks/current/goals`)
- 実績API (`/api/weeks/current/records`)
- ダッシュボードAPI (`/api/dashboard`)
