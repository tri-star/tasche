"""ダッシュボード API エンドポイント."""

from fastapi import APIRouter, Query

from tasche.api.deps import CurrentUser, DbSession
from tasche.schemas.common import APIResponse
from tasche.schemas.dashboard import DashboardResponse
from tasche.services import dashboard as dashboard_service

router = APIRouter()


@router.get("", response_model=APIResponse[DashboardResponse])
async def get_dashboard(
    db: DbSession,
    current_user: CurrentUser,
    timezone_param: str | None = Query(
        None,
        alias="timezone",
        max_length=64,
        description="タイムゾーン（デフォルト: ユーザー設定値）",
    ),
) -> APIResponse[DashboardResponse]:
    """ダッシュボード表示用の集約データを取得する."""
    dashboard = await dashboard_service.get_dashboard(
        db,
        current_user,
        timezone_name=timezone_param,
    )
    return APIResponse(data=dashboard)
