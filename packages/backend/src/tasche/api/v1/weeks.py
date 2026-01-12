"""週 API エンドポイント."""

from datetime import date, datetime, timezone

from fastapi import APIRouter, Query

from tasche.api.deps import CurrentUser
from tasche.schemas.common import APIResponse
from tasche.schemas.week import WeekResponse, WeekUpdate

router = APIRouter()


@router.get("/current", response_model=APIResponse[WeekResponse])
async def get_current_week(
    current_user: CurrentUser,
    timezone_param: str | None = Query(
        None, alias="timezone", description="タイムゾーン（デフォルト: ユーザー設定値）"
    ),
) -> APIResponse[WeekResponse]:
    """現在の週情報を取得する."""
    # ダミーデータを返す
    week = WeekResponse(
        id="wk_01HXYZ1234567890ABCDEF",
        user_id=current_user.id,
        start_date=date(2024, 1, 15),
        end_date=date(2024, 1, 21),
        unit_duration_minutes=30,
        week_start_day="monday",
        week_start_hour=4,
        created_at=datetime(2024, 1, 15, 4, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2024, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
    )
    return APIResponse(data=week)


@router.put("/current", response_model=APIResponse[WeekResponse])
async def update_current_week(
    week_update: WeekUpdate, current_user: CurrentUser
) -> APIResponse[WeekResponse]:
    """現在の週設定を更新する."""
    # ダミーデータを返す
    updated_week = WeekResponse(
        id="wk_01HXYZ1234567890ABCDEF",
        user_id=current_user.id,
        start_date=date(2024, 1, 15),
        end_date=date(2024, 1, 21),
        unit_duration_minutes=week_update.unit_duration_minutes,
        week_start_day="monday",
        week_start_hour=4,
        created_at=datetime(2024, 1, 15, 4, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    return APIResponse(data=updated_week)
