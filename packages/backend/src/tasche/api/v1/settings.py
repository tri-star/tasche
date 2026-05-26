"""設定エンドポイント."""

from fastapi import APIRouter

from tasche.api.deps import CurrentUser, DbSession
from tasche.api.transaction import transaction
from tasche.schemas.common import APIResponse
from tasche.schemas.setting import SettingsResponse, SettingsUpdateRequest
from tasche.services import setting as setting_service

router = APIRouter()


@router.get(
    "",
    response_model=APIResponse[SettingsResponse],
    summary="Get current user settings",
    operation_id="get_current_settings",
)
async def get_current_settings(
    current_user: CurrentUser,
) -> APIResponse[SettingsResponse]:
    """現在ユーザーの設定（timezone / theme）を取得."""
    return APIResponse(data=SettingsResponse.model_validate(current_user))


@router.patch(
    "",
    response_model=APIResponse[SettingsResponse],
    summary="Update current user settings",
    operation_id="update_current_settings",
)
async def update_current_settings(
    payload: SettingsUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> APIResponse[SettingsResponse]:
    """現在ユーザーの設定（timezone / theme）を部分更新."""
    async with transaction(db):
        updated = await setting_service.update_user_settings(
            db,
            current_user,
            timezone=payload.timezone,
            theme=payload.theme,
        )

    return APIResponse(data=SettingsResponse.model_validate(updated))
