"""目標関連のスキーマ定義."""

from pydantic import BaseModel, Field


class DailyAvailableUnits(BaseModel):
    """曜日ごとの確保可能ユニット数."""

    monday: float = Field(0.0, ge=0, description="月曜日の確保可能ユニット数")
    tuesday: float = Field(0.0, ge=0, description="火曜日の確保可能ユニット数")
    wednesday: float = Field(0.0, ge=0, description="水曜日の確保可能ユニット数")
    thursday: float = Field(0.0, ge=0, description="木曜日の確保可能ユニット数")
    friday: float = Field(0.0, ge=0, description="金曜日の確保可能ユニット数")
    saturday: float = Field(0.0, ge=0, description="土曜日の確保可能ユニット数")
    sunday: float = Field(0.0, ge=0, description="日曜日の確保可能ユニット数")


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


class PreviousGoalsResponse(BaseModel):
    """直近過去週の目標設定（フォームのデフォルト値用）."""

    week_id: str = Field(..., description="直近過去週ID")
    week_start_date: str = Field(..., description="直近過去週の開始日 (ISO8601 date)")
    unit_duration_minutes: int = Field(..., description="その週の1ユニット時間（分）")
    daily_available_units: DailyAvailableUnits = Field(
        ..., description="その週の曜日ごと確保可能ユニット数"
    )
    goals: list[GoalResponse] = Field(
        ..., description="その週の目標一覧（アーカイブ済みタスク由来の Goal は除外済み）"
    )


class GoalsResponse(BaseModel):
    """目標一覧レスポンス."""

    week_id: str = Field(..., description="週ID")
    week_start_date: str = Field(..., description="週の開始日")
    unit_duration_minutes: int = Field(..., description="1ユニットの時間（分）")
    daily_available_units: DailyAvailableUnits = Field(
        ..., description="曜日ごとの確保可能ユニット数"
    )
    goals: list[GoalResponse] = Field(..., description="目標一覧")
    has_current_goals: bool = Field(..., description="当週に Goal が1件以上存在するか")
    previous_goals: PreviousGoalsResponse | None = Field(
        None,
        description=(
            "当週に Goal が存在せず、過去に Goal を持つ Week が存在する場合のみ返す"
            "（それ以外は null）"
        ),
    )


class GoalUpdateItem(BaseModel):
    """目標更新アイテム."""

    task_id: str | None = Field(None, description="タスクID（nullの場合は新規タスク作成）")
    new_task_name: str | None = Field(None, description="新規タスク名（task_idがnullの場合に必須）")
    daily_targets: DailyTargets = Field(..., description="曜日ごとの目標ユニット数")


class GoalsUpdate(BaseModel):
    """目標一括更新リクエスト."""

    unit_duration_minutes: int = Field(..., description="1ユニットの時間（分）")
    daily_available_units: DailyAvailableUnits = Field(
        default_factory=DailyAvailableUnits, description="曜日ごとの確保可能ユニット数"
    )
    goals: list[GoalUpdateItem] = Field(..., description="目標一覧")


class CreatedTask(BaseModel):
    """作成されたタスク情報."""

    id: str = Field(..., description="タスクID")
    name: str = Field(..., description="タスク名")


class GoalsUpdateResponse(BaseModel):
    """目標一括更新レスポンス."""

    week_id: str = Field(..., description="週ID")
    week_start_date: str = Field(..., description="週の開始日")
    unit_duration_minutes: int = Field(..., description="1ユニットの時間（分）")
    daily_available_units: DailyAvailableUnits = Field(
        ..., description="曜日ごとの確保可能ユニット数"
    )
    goals: list[GoalResponse] = Field(..., description="更新後の目標一覧")
    created_tasks: list[CreatedTask] = Field(..., description="作成されたタスク一覧")
