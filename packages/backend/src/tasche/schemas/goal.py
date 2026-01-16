"""目標関連のスキーマ定義."""

from pydantic import BaseModel, Field


class DailyTargets(BaseModel):
    """曜日ごとの目標ユニット数."""

    monday: float = Field(..., ge=0, description="月曜日の目標ユニット数")
    tuesday: float = Field(..., ge=0, description="火曜日の目標ユニット数")
    wednesday: float = Field(..., ge=0, description="水曜日の目標ユニット数")
    thursday: float = Field(..., ge=0, description="木曜日の目標ユニット数")
    friday: float = Field(..., ge=0, description="金曜日の目標ユニット数")
    saturday: float = Field(..., ge=0, description="土曜日の目標ユニット数")
    sunday: float = Field(..., ge=0, description="日曜日の目標ユニット数")


class GoalResponse(BaseModel):
    """目標レスポンス."""

    task_id: str = Field(..., description="タスクID")
    task_name: str = Field(..., description="タスク名")
    daily_targets: DailyTargets = Field(..., description="曜日ごとの目標ユニット数")


class GoalsResponse(BaseModel):
    """目標一覧レスポンス."""

    week_id: str = Field(..., description="週ID")
    unit_duration_minutes: int = Field(..., description="1ユニットの時間（分）")
    goals: list[GoalResponse] = Field(..., description="目標一覧")


class GoalUpdateItem(BaseModel):
    """目標更新アイテム."""

    task_id: str | None = Field(None, description="タスクID（nullの場合は新規タスク作成）")
    new_task_name: str | None = Field(None, description="新規タスク名（task_idがnullの場合に必須）")
    daily_targets: DailyTargets = Field(..., description="曜日ごとの目標ユニット数")


class GoalsUpdate(BaseModel):
    """目標一括更新リクエスト."""

    unit_duration_minutes: int = Field(..., description="1ユニットの時間（分）")
    goals: list[GoalUpdateItem] = Field(..., description="目標一覧")


class CreatedTask(BaseModel):
    """作成されたタスク情報."""

    id: str = Field(..., description="タスクID")
    name: str = Field(..., description="タスク名")


class GoalsUpdateResponse(BaseModel):
    """目標一括更新レスポンス."""

    week_id: str = Field(..., description="週ID")
    unit_duration_minutes: int = Field(..., description="1ユニットの時間（分）")
    goals: list[GoalResponse] = Field(..., description="更新後の目標一覧")
    created_tasks: list[CreatedTask] = Field(..., description="作成されたタスク一覧")
