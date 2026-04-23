# Tasche Backend フォルダ構造

## 概要

Tasche MVP のバックエンド（FastAPI + PostgreSQL）のフォルダ構造を定義します。

## 技術スタック

| 項目             | 技術               |
| ---------------- | ------------------ |
| フレームワーク   | FastAPI            |
| パッケージ管理   | uv                 |
| Linter/Formatter | ruff               |
| ORM              | SQLAlchemy (async) |
| DB               | PostgreSQL (Neon)  |
| 認証             | Google OAuth 2.0 (BFF型 + PKCE) / 自前発行 JWT (Authlib) |
| Lambda 対応      | Mangum             |
| ローカル開発     | Docker Compose     |

## フォルダ構造

```
packages/backend/
├── pyproject.toml              # uv プロジェクト設定、依存関係
├── uv.lock                     # 依存関係ロックファイル
├── ruff.toml                   # ruff 設定
├── Dockerfile                  # 本番用 Dockerfile
├── Dockerfile.dev              # 開発用 Dockerfile
├── compose.yaml                # ローカル開発用
├── .env.example                # 環境変数サンプル
├── alembic.ini                 # Alembic 設定
├── README.md                   # バックエンド README
│
├── src/
│   └── tasche/                 # メインパッケージ (import tasche.xxx)
│       ├── __init__.py
│       ├── main.py             # FastAPI アプリケーション初期化
│       ├── handler.py          # Lambda ハンドラー (Mangum)
│       │
│       ├── api/                # API レイヤー
│       │   ├── __init__.py
│       │   ├── deps.py         # 共通依存関係 (get_db, get_current_user 等)
│       │   └── v1/             # API バージョン 1
│       │       ├── __init__.py
│       │       ├── router.py   # v1 ルーター集約
│       │       ├── auth.py     # 認証エンドポイント (Google OAuth + 自前JWT + スタブ)
│       │       ├── users.py    # ユーザーエンドポイント
│       │       ├── tasks.py    # タスクエンドポイント
│       │       ├── weeks.py    # 週エンドポイント
│       │       ├── goals.py    # 目標エンドポイント
│       │       ├── records.py  # 実績エンドポイント
│       │       └── dashboard.py # ダッシュボードエンドポイント
│       │
│       ├── core/               # コア設定・ユーティリティ
│       │   ├── __init__.py
│       │   ├── config.py       # 環境変数・設定管理 (pydantic-settings)
│       │   ├── security.py     # JWT 検証 (自前 RS256/HS256 + スタブフォールバック)
│       │   ├── oauth.py        # Google OAuth 2.0 クライアント (Authlib)
│       │   ├── env.py          # APP_ENV / スタブ有効判定関数など環境分岐
│       │   └── exceptions.py   # カスタム例外、エラーハンドラー
│       │
│       ├── db/                 # データベース関連
│       │   ├── __init__.py
│       │   ├── session.py      # DB セッション管理 (async)
│       │   └── base.py         # SQLAlchemy Base クラス
│       │
│       ├── models/             # SQLAlchemy モデル (テーブル定義)
│       │   ├── __init__.py
│       │   ├── user.py         # User モデル
│       │   ├── task.py         # Task モデル
│       │   ├── week.py         # Week モデル
│       │   ├── goal.py         # Goal モデル (DailyGoal)
│       │   └── record.py       # Record モデル
│       │
│       ├── schemas/            # Pydantic スキーマ (リクエスト/レスポンス)
│       │   ├── __init__.py
│       │   ├── common.py       # 共通スキーマ (APIResponse 等)
│       │   ├── auth.py         # 認証スキーマ
│       │   ├── user.py         # ユーザースキーマ
│       │   ├── task.py         # タスクスキーマ
│       │   ├── week.py         # 週スキーマ
│       │   ├── goal.py         # 目標スキーマ
│       │   ├── record.py       # 実績スキーマ
│       │   └── dashboard.py    # ダッシュボードスキーマ
│       │
│       └── services/           # ビジネスロジック + DB アクセス
│           ├── __init__.py
│           ├── auth.py         # 認証サービス (Google OAuth トークン交換・ID Token検証・JWT発行)
│           ├── user.py         # ユーザーサービス
│           ├── task.py         # タスクサービス
│           ├── week.py         # 週サービス (週の引き継ぎロジック等)
│           ├── goal.py         # 目標サービス
│           ├── record.py       # 実績サービス
│           └── dashboard.py    # ダッシュボードサービス (集約データ)
│
├── migrations/                 # Alembic マイグレーション
│   ├── env.py
│   ├── script.py.mako
│   └── versions/               # マイグレーションファイル
│       └── .gitkeep
│
└── tests/                      # テスト
    ├── __init__.py
    ├── conftest.py             # pytest フィクスチャ (テスト DB, テスト JWT 発行)
    ├── utils/                  # テストユーティリティ
    │   ├── __init__.py
    │   └── jwt.py              # テスト用 JWT 発行ユーティリティ
    └── api/                    # API Integration テスト
        ├── __init__.py
        ├── test_auth.py
        ├── test_users.py
        ├── test_tasks.py
        ├── test_weeks.py
        ├── test_goals.py
        ├── test_records.py
        └── test_dashboard.py
```

## 各ディレクトリの役割

### ルートファイル

| ファイル         | 説明                                           |
| ---------------- | ---------------------------------------------- |
| `pyproject.toml` | uv プロジェクト設定、依存関係定義              |
| `uv.lock`        | 依存関係のロックファイル                       |
| `ruff.toml`      | ruff（Linter/Formatter）設定                   |
| `Dockerfile`     | 本番用 Docker イメージ                         |
| `Dockerfile.dev` | 開発用 Docker イメージ（ホットリロード対応等） |
| `compose.yaml`   | ローカル開発環境（API + PostgreSQL）           |
| `.env.example`   | 環境変数のサンプル                             |
| `alembic.ini`    | Alembic（DB マイグレーション）設定             |

### src/tasche/

メインアプリケーションパッケージ。`import tasche.xxx` の形式で使用。

| ファイル/ディレクトリ | 説明                                           |
| --------------------- | ---------------------------------------------- |
| `main.py`             | FastAPI アプリケーション初期化                 |
| `handler.py`          | Lambda ハンドラー（Mangum 経由）               |
| `api/`                | API レイヤー（エンドポイント定義）             |
| `core/`               | コア設定・ユーティリティ                       |
| `db/`                 | データベース接続管理                           |
| `models/`             | SQLAlchemy モデル（テーブル定義）              |
| `schemas/`            | Pydantic スキーマ（リクエスト/レスポンス定義） |
| `services/`           | ビジネスロジック + DB アクセス                 |

### api/

HTTP リクエスト/レスポンスの処理を担当。

```
api/
├── deps.py         # 共通依存関係（get_db, get_current_user 等）
└── v1/             # API v1 エンドポイント群
    ├── router.py   # v1 ルーターの集約
    ├── auth.py     # GET /api/auth/google/authorize, POST /api/auth/google/callback, /refresh, /logout, /stub-login（スタブ有効時のみ）
    ├── users.py    # GET /api/users/me
    ├── tasks.py    # GET/POST /api/tasks, PUT/DELETE /api/tasks/{id}
    ├── weeks.py    # GET/PUT /api/weeks/current
    ├── goals.py    # GET/PUT /api/weeks/current/goals
    ├── records.py  # GET /api/weeks/current/records, PUT /{day}/{task_id}
    └── dashboard.py # GET /api/dashboard
```

### core/

アプリケーション全体で使用する設定・ユーティリティ。

| ファイル        | 説明                                       |
| --------------- | ------------------------------------------ |
| `config.py`     | pydantic-settings を使用した環境変数管理   |
| `security.py`   | 自前 JWT 検証（RS256/HS256 + スタブフォールバック） |
| `oauth.py`      | Google OAuth 2.0 クライアント（Authlib）    |
| `env.py`        | `APP_ENV` 判定・`is_auth_stub_enabled()` などの環境分岐ヘルパ |
| `exceptions.py` | カスタム例外クラス、FastAPI 例外ハンドラー |

### models/

SQLAlchemy ORM モデル（テーブル定義）。

| ファイル    | 対応テーブル | 説明                        |
| ----------- | ------------ | --------------------------- |
| `user.py`   | users        | ユーザー情報                |
| `task.py`   | tasks        | タスク定義                  |
| `week.py`   | weeks        | 週設定（ユニット時間等）    |
| `goal.py`   | goals        | 曜日別目標（daily_targets） |
| `record.py` | records      | 実績記録                    |

### schemas/

Pydantic スキーマ（API リクエスト/レスポンスの型定義）。

| ファイル       | 説明                                    |
| -------------- | --------------------------------------- |
| `common.py`    | 共通スキーマ（APIResponse、Error 等）   |
| `auth.py`      | 認証関連（AuthorizeRequest/Response、GoogleCallback、TokenResponse、StubLoginRequest） |
| `user.py`      | ユーザー関連                            |
| `task.py`      | タスク関連（TaskCreate、TaskResponse）  |
| `week.py`      | 週関連                                  |
| `goal.py`      | 目標関連                                |
| `record.py`    | 実績関連                                |
| `dashboard.py` | ダッシュボード集約データ                |

### services/

ビジネスロジックと DB アクセスを担当。

| ファイル       | 説明                                  |
| -------------- | ------------------------------------- |
| `auth.py`      | Google OAuth トークン交換、ID Token 検証、自前 JWT 発行、リフレッシュトークン管理、ユーザー登録/取得 |
| `user.py`      | ユーザー情報取得・更新                |
| `task.py`      | タスク CRUD 操作                      |
| `week.py`      | 週の取得・更新、週の引き継ぎロジック  |
| `goal.py`      | 目標設定の取得・更新                  |
| `record.py`    | 実績記録の取得・更新                  |
| `dashboard.py` | ダッシュボード用集約データの構築      |

## 設計方針

### 1. シンプルなレイヤー構成

```
┌─────────────────────────────────────────┐
│  api/       - HTTP 処理                 │
├─────────────────────────────────────────┤
│  services/  - ビジネスロジック + DB     │
├─────────────────────────────────────────┤
│  models/    - SQLAlchemy ORM モデル     │
│  schemas/   - Pydantic スキーマ         │
└─────────────────────────────────────────┘
```

- **リポジトリ層なし**: services/ から直接 SQLAlchemy を使用
- MVP としてシンプルさを優先し、過度な抽象化を避ける

### 2. src レイアウト

- PEP 517/518 推奨の `src/` レイアウトを採用
- パッケージ名を `tasche` とし、`import tasche.api.v1.tasks` のように使用
- uv でのビルド・インストールに対応

### 3. API バージョニング

- `api/v1/` でバージョン管理
- 将来の Breaking Change に対応可能

### 4. Lambda 対応

- `main.py`: ローカル開発用（uvicorn 直接起動）
- `handler.py`: Lambda 用（Mangum 経由）

## テスト方針

### 基本方針

- **モック/スタブを最小化**: 実際の動作に近いテストを重視
- **Integration Test 重視**: API エンドポイントレベルでのテストを厚く
- **テスト用 DB**: Docker Compose で PostgreSQL を起動し、実 DB に対してテスト

### Google OAuth / スタブ認証 のテスト対応

E2E テストやローカル開発で外部 Google 認証を通さず動作確認するため、スタブログインエンドポイントを用意する:

```
┌──────────────────────────────────────────────────────────────────┐
│                    JWT 検証フロー                                 │
├──────────────────────────────────────────────────────────────────┤
│  1. 自前発行 JWT の検証を試行（RS256 or HS256）                    │
│     ↓ 成功 → ユーザー情報取得                                      │
│     ↓ 失敗                                                        │
│  2. is_auth_stub_enabled() が true の場合のみ:                     │
│     スタブ JWT (HS256 / 専用シークレット) の検証にフォールバック   │
│     ↓ 成功 → テストユーザー情報取得                                │
│     ↓ 失敗 → 401 Unauthorized                                     │
└──────────────────────────────────────────────────────────────────┘
```

- `core/env.py`: `is_auth_stub_enabled()` — `APP_ENV=production` の場合は常に false を返す
- `core/security.py`: スタブ有効時のみスタブ JWT 検証にフォールバック
- `api/v1/auth.py`: `POST /api/auth/stub-login` — スタブ有効時のみルーティング登録（無効時は 404）
- `tests/utils/jwt.py`: テスト用 JWT（スタブ相当）発行ユーティリティ

## 主要ファイルの実装例

### main.py

```python
from fastapi import FastAPI
from tasche.api.v1.router import api_router
from tasche.core.config import settings

app = FastAPI(title="Tasche API")
app.include_router(api_router, prefix="/api")
```

### handler.py (Lambda 用)

```python
from mangum import Mangum
from tasche.main import app

handler = Mangum(app, lifespan="off")
```

### core/config.py

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    app_env: str = "local"  # local / development / staging / production

    # Google OAuth 2.0
    google_oauth_client_id: str
    google_oauth_client_secret: str
    google_oauth_redirect_uris: str  # カンマ区切りの許可リスト

    # 自前発行 JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expires_seconds: int = 900
    jwt_refresh_token_expires_seconds: int = 604800

    # Cookie
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cookie_domain: str = ""

    # スタブ認証
    auth_stub_enabled: bool = False
    auth_stub_jwt_secret: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
```

### api/deps.py

```python
from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from tasche.db.session import get_db
from tasche.core.security import get_current_user
from tasche.models.user import User

# 型エイリアス
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
```

### api/v1/router.py

```python
from fastapi import APIRouter
from tasche.api.v1 import auth, users, tasks, weeks, goals, records, dashboard

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["認証"])
api_router.include_router(users.router, prefix="/users", tags=["ユーザー"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["タスク"])
api_router.include_router(weeks.router, prefix="/weeks", tags=["週"])
api_router.include_router(goals.router, prefix="/weeks/current/goals", tags=["目標"])
api_router.include_router(records.router, prefix="/weeks/current/records", tags=["実績"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["ダッシュボード"])
```
