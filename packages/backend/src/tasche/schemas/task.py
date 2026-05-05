"""タスク関連のスキーマ定義."""

from datetime import datetime

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    """タスク作成リクエスト."""

    name: str = Field(..., description="タスク名（前後空白は除去され、1〜100文字）")


class TaskUpdate(BaseModel):
    """タスク更新リクエスト."""

    name: str = Field(..., description="タスク名（前後空白は除去され、1〜100文字）")


class TaskResponse(BaseModel):
    """タスクレスポンス."""

    id: str = Field(..., description="タスクID（ULID形式、prefix: tsk_）")
    name: str = Field(..., description="タスク名")
    is_archived: bool = Field(..., description="アーカイブフラグ")
    created_at: datetime = Field(..., description="作成日時（ISO 8601）")
    updated_at: datetime = Field(..., description="更新日時（ISO 8601）")

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    """タスク一覧レスポンス."""

    tasks: list[TaskResponse] = Field(..., description="タスク一覧")
