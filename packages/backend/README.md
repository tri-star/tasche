# Tasche Backend API

Tasche MVP のバックエンド API（FastAPI + PostgreSQL）

## 技術スタック

- **Framework**: FastAPI
- **Package Manager**: uv
- **Linter/Formatter**: ruff
- **ORM**: SQLAlchemy (async)
- **Database**: PostgreSQL (Neon for production, Docker for local)
- **Authentication**: Auth0 (JWT)
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

```bash
# 全テスト実行
docker-compose exec api pytest

# 失敗したテストから詳細表示
docker-compose exec api pytest -x

# 特定のテストだけ実行（例）
docker-compose exec api pytest -k users
```

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

```
packages/backend/
├── src/tasche/         # メインパッケージ
│   ├── api/           # API レイヤー
│   ├── core/          # コア設定
│   ├── db/            # データベース
│   ├── models/        # SQLAlchemy モデル
│   ├── schemas/       # Pydantic スキーマ
│   └── services/      # ビジネスロジック
├── migrations/        # Alembic マイグレーション
└── tests/            # テスト (future)
```

## MVP 範囲

Phase 1〜3で以下を実装：

1. **Phase 1**: Docker起動、ヘルスチェック
2. **Phase 2**: DB接続、User モデル
3. **Phase 3**: テスト用JWT認証、`/api/users/me`

将来実装予定：

- タスクAPI (`/api/tasks`)
- 週API (`/api/weeks/current`)
- 目標API (`/api/weeks/current/goals`)
- 実績API (`/api/weeks/current/records`)
- ダッシュボードAPI (`/api/dashboard`)
- Auth0 本実装
