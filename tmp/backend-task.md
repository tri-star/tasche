# Tasche Backend 実装タスク記録

最終更新: 2026-01-11 21:45

## 📊 全体進捗

- **Phase 1**: ✅ 完了
- **Phase 2**: ✅ 完了
- **Phase 3**: ✅ 完了（テスト用トークンサービス + テストコード実装完了）

---

## ✅ 完了したタスク

### Phase 1: 基本構造 + Docker起動確認

- [x] プロジェクト骨格作成（packages/backend/ ディレクトリ構造）
- [x] pyproject.toml 作成（uv設定、依存関係定義）
  - FastAPI, SQLAlchemy (async), Alembic, python-jose, python-ulid, pydantic[email] 等
- [x] Docker設定
  - Dockerfile.dev: uv + ホットリロード対応
  - docker-compose.yml: PostgreSQL 17 + FastAPI サービス
  - scripts/ ディレクトリをマウント追加
- [x] 最小限のFastAPI実装
  - GET / (ルートエンドポイント)
  - GET /health (ヘルスチェック)
- [x] 動作確認
  - ✅ `curl http://localhost:8000/health` → `{"status":"healthy"}`

### Phase 2: DB接続 + Alembic

- [x] コア設定作成
  - `src/tasche/core/config.py`: pydantic-settings で環境変数管理
  - `src/tasche/db/base.py`: SQLAlchemy Base クラス
  - `src/tasche/db/session.py`: async セッション管理
- [x] モデル定義
  - `src/tasche/models/user.py`: User モデル（ULID, email, name, picture, timezone）
  - `src/tasche/models/__init__.py`: モデルエクスポート
- [x] Alembic設定
  - `alembic.ini`: Alembic設定ファイル
  - `migrations/env.py`: async対応の環境設定
  - `migrations/script.py.mako`: マイグレーションテンプレート
- [x] マイグレーション実行
  - ✅ `alembic revision --autogenerate -m "Initial migration"`
  - ✅ `alembic upgrade head`
  - ✅ users テーブル作成確認
- [x] Seeder作成（Laravel風）
  - `scripts/seed.py`: テストユーザー2件投入
  - `scripts/reset_db.py`: データベースリセット
  - ✅ Seeder実行成功

### Phase 3: 認証基盤 + API実装

- [x] 認証基盤
  - `src/tasche/core/security.py`: テスト用JWT検証（python-jose使用）
  - `src/tasche/core/exceptions.py`: カスタム例外
- [x] スキーマ定義
  - `src/tasche/schemas/common.py`: APIResponse, ErrorResponse
  - `src/tasche/schemas/user.py`: UserResponse（EmailStr使用）
- [x] サービス層
  - `src/tasche/services/user.py`: get_user_by_id, get_user_by_email
- [x] API実装
  - `src/tasche/api/deps.py`: 共通依存関係（DbSession, CurrentUser）
  - `src/tasche/api/v1/router.py`: v1ルーター集約
  - `src/tasche/api/v1/users.py`: GET /api/users/me
- [x] FastAPI統合
  - `src/tasche/main.py`: API v1ルーター登録（/api プレフィックス）

---

## ✅ Phase 3 完了: テスト用トークンサービス + テストコード

### 実装内容

1. **TestTokenService 作成**
   - `src/tasche/core/test_auth.py`
   - `enable_test_auth==True` の時のみ利用可能
   - python-jose を使って正しい署名でトークンを発行

2. **pytest 設定追加**
   - `pyproject.toml` に `[tool.pytest.ini_options]` 追加
   - `aiosqlite>=0.20.0` を dev 依存関係に追加

3. **conftest.py 作成**
   - `src/tasche/conftest.py`
   - テスト用DBセッション（SQLite in-memory）
   - テスト用HTTPクライアント
   - token_service fixture
   - test_user fixture

4. **テストコード作成（コロケーション方式）**
   - `src/tasche/api/v1/tests/__init__.py`
   - `src/tasche/api/v1/tests/test_users.py`
     - ✅ `test_get_current_user_success`: 認証済みユーザー情報取得
     - ✅ `test_get_current_user_unauthorized`: 認証なしで401
     - ✅ `test_get_current_user_invalid_token`: 無効なトークンで401
     - ✅ `test_get_current_user_not_found`: 存在しないユーザーで404

### テスト実行結果

```bash
$ docker-compose exec api pytest src/tasche/api/v1/tests/test_users.py -v
========================= 4 passed, 1 warning in 0.66s =========================
```

**全てのテストがパス！** 🎉

### Phase 3 成功基準達成

- ✅ Docker起動、ヘルスチェック
- ✅ Alembic マイグレーション、users テーブル作成
- ✅ テスト用JWT で `/api/users/me` が認証付きで動作（テストで検証済み）

---

## 🔄 次のステップ

---

## 📋 今後の実装予定（Phase 4以降）

### 優先度1: タスクAPI

- [ ] Task モデル作成（id, user_id, name, unit_time, color, archived）
- [ ] Alembic マイグレーション
- [ ] タスクサービス層
- [ ] タスクスキーマ
- [ ] API実装
  - GET /api/tasks
  - POST /api/tasks
  - PUT /api/tasks/{task_id}
  - DELETE /api/tasks/{task_id}

### 優先度2: 週API

- [ ] Week, Goal, Record モデル作成
- [ ] Alembic マイグレーション
- [ ] サービス層
- [ ] API実装
  - GET /api/weeks/current
  - PUT /api/weeks/current
  - GET /api/weeks/current/goals
  - PUT /api/weeks/current/goals

### 優先度3: 実績API

- [ ] API実装
  - GET /api/weeks/current/records
  - PUT /api/weeks/current/records/{day}/{task_id}

### 優先度4: ダッシュボードAPI

- [ ] 集計ロジック実装
- [ ] API実装
  - GET /api/dashboard

### 優先度5: Auth0本実装

- [ ] Auth0 JWT検証実装（公開鍵取得・キャッシュ）
- [ ] テスト用フォールバック削除
- [ ] 認証コールバックAPI実装
  - POST /api/auth/callback
  - POST /api/auth/refresh
  - POST /api/auth/logout

---

## 🛠️ 技術メモ

### 依存関係

```toml
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "pydantic>=2.10.0",
    "pydantic[email]>=2.10.0",  # EmailStr用
    "pydantic-settings>=2.6.0",
    "python-jose[cryptography]>=3.3.0",
    "python-ulid>=3.1.0",
]
```

### 環境変数（.env）

```bash
DATABASE_URL=postgresql+asyncpg://tasche:tasche_dev_password@db:5432/tasche
AUTH0_DOMAIN=dummy.auth0.com
AUTH0_AUDIENCE=dummy-audience
ENABLE_TEST_AUTH=true
TEST_JWT_SECRET=dev_secret_key_change_in_production_12345678
LOG_LEVEL=debug
```

### よく使うコマンド

```bash
# コンテナ起動
docker-compose -f packages/backend/docker-compose.yml up -d

# ログ確認
docker logs tasche-api --tail 50 -f

# Seeder実行
docker-compose -f packages/backend/docker-compose.yml exec api python scripts/seed.py

# マイグレーション
docker-compose -f packages/backend/docker-compose.yml exec api alembic revision --autogenerate -m "description"
docker-compose -f packages/backend/docker-compose.yml exec api alembic upgrade head

# DB確認
docker-compose -f packages/backend/docker-compose.yml exec db psql -U tasche -d tasche -c "\dt"
```

---

## 📁 作成済みファイル一覧

### プロジェクトルート

```
packages/backend/
├── pyproject.toml
├── ruff.toml
├── Dockerfile.dev
├── docker-compose.yml
├── .env.example
├── alembic.ini
├── README.md
├── .dockerignore
└── .gitignore
```

### ソースコード

```
src/tasche/
├── __init__.py
├── main.py
├── api/
│   ├── __init__.py
│   ├── deps.py
│   └── v1/
│       ├── __init__.py
│       ├── router.py
│       └── users.py
├── core/
│   ├── __init__.py
│   ├── config.py
│   ├── security.py
│   └── exceptions.py
├── db/
│   ├── __init__.py
│   ├── base.py
│   └── session.py
├── models/
│   ├── __init__.py
│   └── user.py
├── schemas/
│   ├── __init__.py
│   ├── common.py
│   └── user.py
└── services/
    ├── __init__.py
    └── user.py
```

### スクリプト

```
scripts/
├── seed.py
└── reset_db.py
```

### マイグレーション

```
migrations/
├── env.py
├── script.py.mako
└── versions/
    ├── .gitkeep
    └── 26e0e606f3c6_initial_migration.py
```

---

## 🐛 遭遇したトラブルと解決策

### 1. PostgreSQL バージョン不一致

**問題:** 既存のPostgreSQL 15のボリュームが残っていて、PostgreSQL 17で起動失敗

**解決:** `docker-compose down -v` でボリューム削除して再作成

### 2. pyproject.toml でパッケージが見つからない

**問題:** hatchling が `tasche` パッケージを見つけられない

**解決:** `[tool.hatch.build.targets.wheel]` に `packages = ["src/tasche"]` を追加

### 3. alembic.ini がディレクトリとしてマウント

**問題:** `mkdir -p alembic.ini` を実行してディレクトリになっていた

**解決:** `rm -rf alembic.ini` でディレクトリ削除後、ファイルとして再作成

### 4. email-validator 未インストール

**問題:** EmailStr 使用時に `ImportError: email-validator is not installed`

**解決:** `pydantic[email]>=2.10.0` を依存関係に追加

### 5. JWT署名検証エラー

**問題:** ローカルの PyJWT と python-jose の互換性問題

**解決（未完）:** python-jose でトークン生成スクリプトを作成予定

---

## 📚 参考資料

- FastAPI公式: https://fastapi.tiangolo.com/
- SQLAlchemy 2.0: https://docs.sqlalchemy.org/en/20/
- Alembic: https://alembic.sqlalchemy.org/
- python-jose: https://python-jose.readthedocs.io/
- Pydantic: https://docs.pydantic.dev/
