"""タスク関連のスキーマ定義."""

from datetime import datetime

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    """タスク作成リクエスト."""

    name: str = Field(
        ..., min_length=1, max_length=100, description="タスク名（前後空白は除去され、1〜100文字）"
    )


class TaskUpdate(BaseModel):
    """タスク更新リクエスト."""

    name: str = Field(
        ..., min_length=1, max_length=100, description="タスク名（前後空白は除去され、1〜100文字）"
    )


class TaskResponse(BaseModel):
    """タスクレスポンス."""

    id: str = Field(..., description="タスクID（ULID形式、prefix: tsk_）")
    name: str = Field(..., description="タスク名")
    is_archived: bool = Field(..., description="アーカイブフラグ")
    consumed_units_last_week: float = Field(
        ..., description="先週（ユーザーTZのISO週相当）の消化ユニット数合計"
    )
    consumed_units_total: float = Field(..., description="全期間の消化ユニット数合計")
    created_at: datetime = Field(..., description="作成日時（ISO 8601）")
    updated_at: datetime = Field(..., description="更新日時（ISO 8601）")

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    """タスク一覧レスポンス（ページング対応）."""

    items: list[TaskResponse] = Field(..., description="タスク一覧（現在ページ）")
    total: int = Field(..., description="全件数")
    page: int = Field(..., description="現在ページ（1-indexed）")
    per_page: int = Field(..., description="1ページあたり件数")


class TaskBulkArchiveRequest(BaseModel):
    """バルクアーカイブのリクエスト."""

    ids: list[str] = Field(
        ..., min_length=1, max_length=100, description="アーカイブ対象のタスクID一覧"
    )


class TaskBulkArchiveResponse(BaseModel):
    """バルクアーカイブのレスポンス."""

    archived_ids: list[str] = Field(..., description="アーカイブできたタスクID")
    not_found_ids: list[str] = Field(
        ..., description="存在しない/他ユーザーの/既にアーカイブ済みのタスクID"
    )
