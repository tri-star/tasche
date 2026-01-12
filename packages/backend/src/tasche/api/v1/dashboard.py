"""ダッシュボード API エンドポイント."""

from datetime import date

from fastapi import APIRouter, Query

from tasche.api.deps import CurrentUser
from tasche.schemas.common import APIResponse
from tasche.schemas.dashboard import (
    DailyData,
    DashboardResponse,
    TodayGoal,
    WeekInfo,
    WeeklyMatrixItem,
)

router = APIRouter()


@router.get("", response_model=APIResponse[DashboardResponse])
async def get_dashboard(
    current_user: CurrentUser,
    timezone_param: str | None = Query(
        None, alias="timezone", description="タイムゾーン（デフォルト: ユーザー設定値）"
    ),
) -> APIResponse[DashboardResponse]:
    """ダッシュボード表示用の集約データを取得する."""
    # ダミーデータを返す
    dashboard = DashboardResponse(
        current_date=date(2024, 1, 17),
        current_day_of_week="wednesday",
        week=WeekInfo(
            id="wk_01HXYZ1234567890ABCDEF",
            start_date=date(2024, 1, 15),
            end_date=date(2024, 1, 21),
            unit_duration_minutes=30,
        ),
        today_goals=[
            TodayGoal(
                task_id="tsk_01HXYZ1234567890ABCDEF",
                task_name="英語学習",
                target_units=2.0,
                actual_units=1.5,
                completion_rate=75.0,
            ),
            TodayGoal(
                task_id="tsk_02HXYZ1234567890ABCDEF",
                task_name="個人開発",
                target_units=0,
                actual_units=0,
                completion_rate=None,
            ),
        ],
        weekly_matrix=[
            WeeklyMatrixItem(
                task_id="tsk_01HXYZ1234567890ABCDEF",
                task_name="英語学習",
                daily_data={
                    "monday": DailyData(
                        target_units=2.0, actual_units=2.5, completion_rate=125.0
                    ),
                    "tuesday": DailyData(
                        target_units=1.0, actual_units=1.0, completion_rate=100.0
                    ),
                    "wednesday": DailyData(
                        target_units=2.0, actual_units=1.5, completion_rate=75.0
                    ),
                    "thursday": DailyData(
                        target_units=1.0, actual_units=0, completion_rate=0
                    ),
                    "friday": DailyData(
                        target_units=2.0, actual_units=0, completion_rate=0
                    ),
                    "saturday": DailyData(
                        target_units=0, actual_units=0, completion_rate=None
                    ),
                    "sunday": DailyData(
                        target_units=0, actual_units=0, completion_rate=None
                    ),
                },
            ),
            WeeklyMatrixItem(
                task_id="tsk_02HXYZ1234567890ABCDEF",
                task_name="個人開発",
                daily_data={
                    "monday": DailyData(
                        target_units=2.0, actual_units=2.0, completion_rate=100.0
                    ),
                    "tuesday": DailyData(
                        target_units=2.0, actual_units=1.5, completion_rate=75.0
                    ),
                    "wednesday": DailyData(
                        target_units=0, actual_units=0, completion_rate=None
                    ),
                    "thursday": DailyData(
                        target_units=2.0, actual_units=0, completion_rate=0
                    ),
                    "friday": DailyData(
                        target_units=0, actual_units=0, completion_rate=None
                    ),
                    "saturday": DailyData(
                        target_units=4.0, actual_units=0, completion_rate=0
                    ),
                    "sunday": DailyData(
                        target_units=4.0, actual_units=0, completion_rate=0
                    ),
                },
            ),
        ],
        has_goals_configured=True,
    )
    return APIResponse(data=dashboard)
