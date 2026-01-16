"""週関連のスキーマ定義."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class WeekUpdate(BaseModel):
    """週設定更新リクエスト."""

    unit_duration_minutes: Literal[10, 30, 60, 120] = Field(
        ..., description="1ユニットの時間（分）: 10, 30, 60, 120"
    )


class WeekResponse(BaseModel):
    """週情報レスポンス."""

    id: str = Field(..., description="週ID（ULID形式、prefix: wk_）")
    user_id: str = Field(..., description="ユーザーID")
    start_date: date = Field(..., description="週開始日（YYYY-MM-DD）")
    end_date: date = Field(..., description="週終了日（YYYY-MM-DD）")
    unit_duration_minutes: int = Field(..., description="1ユニットの時間（分）: 10, 30, 60, 120")
    week_start_day: Literal["monday", "sunday"] = Field(
        ..., description="週開始曜日: monday or sunday"
    )
    week_start_hour: int = Field(..., ge=0, le=23, description="週開始時刻（時）: 0-23")
    created_at: datetime = Field(..., description="作成日時（ISO 8601）")
    updated_at: datetime = Field(..., description="更新日時（ISO 8601）")

    model_config = {"from_attributes": True}
