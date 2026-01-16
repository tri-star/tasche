"""ダッシュボード関連のスキーマ定義."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class WeekInfo(BaseModel):
    """週情報."""

    id: str = Field(..., description="週ID")
    start_date: date = Field(..., description="週開始日")
    end_date: date = Field(..., description="週終了日")
    unit_duration_minutes: int = Field(..., description="1ユニットの時間（分）")


class TodayGoal(BaseModel):
    """今日の目標."""

    task_id: str = Field(..., description="タスクID")
    task_name: str = Field(..., description="タスク名")
    target_units: float = Field(..., ge=0, description="目標ユニット数")
    actual_units: float = Field(..., ge=0, description="実績ユニット数")
    completion_rate: float | None = Field(None, description="達成率（%）。目標が0の場合はnull")


class DailyData(BaseModel):
    """日次データ."""

    target_units: float = Field(..., ge=0, description="目標ユニット数")
    actual_units: float = Field(..., ge=0, description="実績ユニット数")
    completion_rate: float | None = Field(None, description="達成率（%）。目標が0の場合はnull")


class WeeklyMatrixItem(BaseModel):
    """週次マトリックスアイテム."""

    task_id: str = Field(..., description="タスクID")
    task_name: str = Field(..., description="タスク名")
    daily_data: dict[
        Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        DailyData,
    ] = Field(..., description="曜日ごとのデータ")


class DashboardResponse(BaseModel):
    """ダッシュボードレスポンス."""

    current_date: date = Field(..., description="現在の日付")
    current_day_of_week: Literal[
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    ] = Field(..., description="現在の曜日")
    week: WeekInfo = Field(..., description="週情報")
    today_goals: list[TodayGoal] = Field(..., description="今日の目標一覧")
    weekly_matrix: list[WeeklyMatrixItem] = Field(..., description="週次マトリックス")
    has_goals_configured: bool = Field(
        ...,
        description="目標設定済みフラグ（false の場合は目標設定ウィザードへの誘導が必要）",
    )
