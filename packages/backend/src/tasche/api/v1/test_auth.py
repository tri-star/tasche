"""テスト用トークン発行 API."""

from datetime import timedelta

from fastapi import APIRouter, HTTPException, Query
from pydantic import EmailStr

from tasche.core.config import settings
from tasche.core.test_auth import TestAuthDisabledError, TestTokenService
from tasche.schemas.auth import TestTokenResponse

router = APIRouter()


@router.get("", response_model=TestTokenResponse)
async def create_test_token(
    email: EmailStr | None = Query(default=None),
    user_id: str | None = Query(default=None),
    expires_in: int | None = Query(default=None, ge=1),
) -> TestTokenResponse:
    """テスト用JWTトークンを発行する."""
    try:
        token_service = TestTokenService()
    except TestAuthDisabledError as exc:
        raise HTTPException(status_code=404, detail="Not Found") from exc

    user_id = user_id or settings.test_auth_default_user_id
    email = email or settings.test_auth_default_user_email

    expires_delta = (
        timedelta(seconds=expires_in)
        if expires_in is not None
        else timedelta(hours=1)
    )

    token = token_service.create_token(
        user_id=user_id,
        email=email,
        expires_delta=expires_delta,
    )

    return TestTokenResponse(access_token=token)
