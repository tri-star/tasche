"""ユーザーエンドポイント."""

from fastapi import APIRouter

from tasche.api.deps import CurrentUser
from tasche.schemas.common import APIResponse
from tasche.schemas.user import UserResponse

router = APIRouter()


@router.get("/me", response_model=APIResponse[UserResponse])
async def get_current_user_info(current_user: CurrentUser):
    """現在のユーザー情報を取得."""
    return APIResponse(data=UserResponse.model_validate(current_user))
