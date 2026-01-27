"""実績関連のスキーマ定義."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DailyActuals(BaseModel):
    """曜日ごとの実績ユニット数."""

    monday: float = Field(..., ge=0, description="月曜日の実績ユニット数")
    tuesday: float = Field(..., ge=0, description="火曜日の実績ユニット数")
    wednesday: float = Field(..., ge=0, description="水曜日の実績ユニット数")
    thursday: float = Field(..., ge=0, description="木曜日の実績ユニット数")
    friday: float = Field(..., ge=0, description="金曜日の実績ユニット数")
    saturday: float = Field(..., ge=0, description="土曜日の実績ユニット数")
    sunday: float = Field(..., ge=0, description="日曜日の実績ユニット数")


class RecordResponse(BaseModel):
    """実績レスポンス."""

    id: str = Field(..., description="実績ID（ULID形式、prefix: rec_）")
    week_id: str = Field(..., description="週ID")
    task_id: str = Field(..., description="タスクID")
    task_name: str = Field(..., description="タスク名")
    day_of_week: Literal[
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    ] = Field(..., description="曜日")
    actual_units: float = Field(..., ge=0, description="実績ユニット数（0.1単位）")
    created_at: datetime = Field(..., description="作成日時（ISO 8601）")
    updated_at: datetime = Field(..., description="更新日時（ISO 8601）")

    model_config = {"from_attributes": True}


class RecordItem(BaseModel):
    """実績アイテム."""

    task_id: str = Field(..., description="タスクID")
    task_name: str = Field(..., description="タスク名")
    daily_actuals: DailyActuals = Field(..., description="曜日ごとの実績ユニット数")


class RecordsResponse(BaseModel):
    """実績一覧レスポンス."""

    week_id: str = Field(..., description="週ID")
    unit_duration_minutes: int = Field(..., description="1ユニットの時間（分）")
    records: list[RecordItem] = Field(..., description="実績一覧")


class RecordCreate(BaseModel):
    """実績作成リクエスト."""

    task_id: str = Field(..., description="タスクID")
    day_of_week: Literal[
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    ] = Field(..., description="曜日")
    actual_units: float = Field(..., ge=0, description="実績ユニット数（0.1単位）", multiple_of=0.1)
