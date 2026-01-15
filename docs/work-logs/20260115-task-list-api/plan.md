# GET /api/tasks 実装計画

## 概要

認証済みユーザーのタスク一覧を取得するAPI（GET /api/tasks）を実装する。

## API仕様

| 項目 | 内容 |
|------|------|
| エンドポイント | GET /api/tasks |
| 認証 | 必要（Bearer Token） |
| クエリパラメータ | `include_archived` (boolean, デフォルト: false) |
| レスポンス | `APIResponse[TaskListResponse]` |

### レスポンス例

```json
{
  "data": {
    "tasks": [
      {
        "id": "tsk_01HXYZ1234567890ABCDEF",
        "name": "英語学習",
        "is_archived": false,
        "created_at": "2024-01-10T09:00:00Z",
        "updated_at": "2024-01-10T09:00:00Z"
      }
    ]
  }
}
```

## 現状

- **Taskモデル**: 未実装
- **Taskスキーマ**: 実装済み（schemas/task.py）
- **APIエンドポイント**: ダミー実装済み（api/v1/tasks.py）
- **Taskサービス**: 未実装
- **テスト**: 未実装
- **マイグレーション**: 未実装（現在usersテーブルのみ）

## 実装手順

### Step 1: Taskモデル作成

**ファイル**: `packages/backend/src/tasche/models/task.py`（新規作成）

**参考**: `packages/backend/src/tasche/models/user.py`

```python
"""Task モデル."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from tasche.db.base import Base


class Task(Base):
    """タスクテーブル."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # ULID (tsk_xxxx)
    user_id: Mapped[str] = mapped_column(
        String(30), ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
```

**ポイント:**
- `user_id`: 外部キー制約でusersテーブルと紐付け
- `is_archived`: 論理削除用フラグ（デフォルトfalse）
- `name`: 最大100文字（スキーマ定義と一致）
- IDはULID形式で`tsk_`プレフィックス付き（30文字）

### Step 2: models/__init__.py 更新

**ファイル**: `packages/backend/src/tasche/models/__init__.py`（既存更新）

Taskモデルをエクスポートに追加:

```python
"""Models package."""
from tasche.models.task import Task
from tasche.models.user import User

__all__ = ["User", "Task"]
```

### Step 3: マイグレーション作成・実行

```bash
cd packages/backend
uv run alembic revision --autogenerate -m "add_tasks_table"
uv run alembic upgrade head
```

**想定されるマイグレーション内容:**
```python
def upgrade() -> None:
    op.create_table('tasks',
        sa.Column('id', sa.String(length=30), nullable=False),
        sa.Column('user_id', sa.String(length=30), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_archived', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_user_id'), 'tasks', ['user_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_tasks_user_id'), table_name='tasks')
    op.drop_table('tasks')
```

### Step 4: Taskサービス作成

**ファイル**: `packages/backend/src/tasche/services/task.py`（新規作成）

**参考**: `packages/backend/src/tasche/services/user.py`

```python
"""タスクサービス."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.models.task import Task


async def get_tasks_by_user_id(
    db: AsyncSession,
    user_id: str,
    include_archived: bool = False,
) -> list[Task]:
    """ユーザーのタスク一覧を取得.

    Args:
        db: DBセッション
        user_id: ユーザーID
        include_archived: アーカイブ済みタスクを含めるか

    Returns:
        タスクのリスト（作成日時昇順）
    """
    query = select(Task).where(Task.user_id == user_id)

    if not include_archived:
        query = query.where(Task.is_archived == False)  # noqa: E712

    query = query.order_by(Task.created_at)

    result = await db.execute(query)
    return list(result.scalars().all())
```

**ポイント:**
- `include_archived=False` がデフォルト（API仕様通り）
- 作成日時昇順でソート（古いタスクが先）
- SQLAlchemyのBoolean比較は `== False` を使用（E712警告を無視）

### Step 5: APIエンドポイント更新

**ファイル**: `packages/backend/src/tasche/api/v1/tasks.py`（既存更新）

**変更内容:** `get_tasks` 関数のダミー実装を実装に置き換え

```python
"""タスク API エンドポイント."""
from datetime import datetime, timezone

from fastapi import APIRouter, Query

from tasche.api.deps import CurrentUser, DbSession
from tasche.schemas.common import APIResponse
from tasche.schemas.task import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)
from tasche.services import task as task_service

router = APIRouter()


@router.get("", response_model=APIResponse[TaskListResponse])
async def get_tasks(
    db: DbSession,
    current_user: CurrentUser,
    include_archived: bool = Query(False, description="アーカイブ済みタスクを含める"),
) -> APIResponse[TaskListResponse]:
    """タスク一覧を取得する."""
    tasks = await task_service.get_tasks_by_user_id(
        db,
        user_id=current_user.id,
        include_archived=include_archived,
    )

    task_responses = [TaskResponse.model_validate(task) for task in tasks]

    return APIResponse(data=TaskListResponse(tasks=task_responses))


# 以下、他のエンドポイントは既存のダミー実装を維持（今回のスコープ外）
# ...
```

**変更点:**
1. `DbSession` 依存関係を追加
2. `task_service` をインポート
3. ダミーデータを `task_service.get_tasks_by_user_id()` 呼び出しに置き換え
4. `TaskResponse.model_validate(task)` でモデルからスキーマへ変換

### Step 6: テスト作成

**ファイル**: `packages/backend/src/tasche/api/v1/tests/test_tasks.py`（新規作成）

**参考**: `packages/backend/src/tasche/api/v1/tests/test_users.py`

#### テストフィクスチャ

```python
"""GET /api/tasks のテスト."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.test_auth import TestTokenService
from tasche.models.task import Task
from tasche.models.user import User


@pytest.fixture
async def test_tasks(db_session: AsyncSession, test_user: User) -> list[Task]:
    """テスト用タスクを作成."""
    tasks = [
        Task(
            id="tsk_01TEST1234567890ABCDEF",
            user_id=test_user.id,
            name="英語学習",
            is_archived=False,
        ),
        Task(
            id="tsk_02TEST1234567890ABCDEF",
            user_id=test_user.id,
            name="個人開発",
            is_archived=False,
        ),
        Task(
            id="tsk_03TEST1234567890ARCHIVED",
            user_id=test_user.id,
            name="アーカイブ済みタスク",
            is_archived=True,
        ),
    ]
    for task in tasks:
        db_session.add(task)
    await db_session.commit()
    return tasks
```

#### テストケース一覧

| # | テストケース | 説明 | 期待結果 |
|---|-------------|------|---------|
| 1 | `test_get_tasks_success` | 認証済みユーザーがタスク一覧を取得 | 200 + アーカイブ済み除外のタスク一覧 |
| 2 | `test_get_tasks_include_archived` | `include_archived=true`指定 | 200 + アーカイブ済み含む全タスク |
| 3 | `test_get_tasks_empty` | タスクが存在しない場合 | 200 + 空配列 |
| 4 | `test_get_tasks_unauthorized` | 認証なしアクセス | 401 |
| 5 | `test_get_tasks_invalid_token` | 無効なトークン | 401 |
| 6 | `test_get_tasks_only_own_tasks` | 他ユーザーのタスクは取得不可 | 200 + 自分のタスクのみ |
| 7 | `test_get_tasks_response_format` | レスポンス形式の検証 | APIResponse[TaskListResponse]形式 |

主要なテストケースの実装例:

```python
@pytest.mark.asyncio
async def test_get_tasks_success(
    client: AsyncClient,
    test_user: User,
    test_tasks: list[Task],
    token_service: TestTokenService,
):
    """認証済みユーザーがタスク一覧を取得できる."""
    token = token_service.create_token(test_user.id, test_user.email)

    response = await client.get(
        "/api/tasks",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    tasks = data["tasks"]

    # デフォルトではアーカイブ済みを含まない
    assert len(tasks) == 2
    assert tasks[0]["name"] == "英語学習"
    assert tasks[1]["name"] == "個人開発"

    # 全てのタスクがis_archived=False
    for task in tasks:
        assert task["is_archived"] is False
```

## 修正対象ファイル一覧

| ファイル | 操作 | 説明 |
|---------|------|------|
| `src/tasche/models/task.py` | 新規作成 | Taskモデル定義 |
| `src/tasche/models/__init__.py` | 既存更新 | Taskエクスポート追加 |
| `src/tasche/services/task.py` | 新規作成 | タスク取得サービス |
| `src/tasche/api/v1/tasks.py` | 既存更新 | get_tasks関数のみ実装 |
| `src/tasche/api/v1/tests/test_tasks.py` | 新規作成 | APIテスト |
| `migrations/versions/xxx_add_tasks_table.py` | 自動生成 | tasksテーブル作成 |

## 検証方法

### 1. マイグレーション確認

```bash
cd packages/backend
uv run alembic upgrade head
```

### 2. テスト実行

```bash
uv run pytest src/tasche/api/v1/tests/test_tasks.py -v
```

### 3. 手動確認（開発サーバー）

```bash
# 開発サーバー起動
uv run uvicorn tasche.main:app --reload

# API確認（トークン取得後）
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/tasks
curl -H "Authorization: Bearer <token>" "http://localhost:8000/api/tasks?include_archived=true"
```

### 4. OpenAPI ドキュメント確認

http://localhost:8000/docs でエンドポイント確認

## スコープ

### 今回の実装範囲
- GET /api/tasks のみ

### 実装範囲外（別タスクで実装）
- POST /api/tasks（タスク作成）
- PUT /api/tasks/{task_id}（タスク更新）
- DELETE /api/tasks/{task_id}（タスク削除/アーカイブ）

## 参考ドキュメント

- `docs/concept.md` - プロダクトコンセプト
- `docs/glossary.md` - 用語集
- `docs/hearing-memo.md` - ヒアリングメモ
- `docs/mvp.md` - MVP機能定義
- `docs/api-design.md` - API設計
- `packages/backend/docs/folder-structure.md` - フォルダ構造
