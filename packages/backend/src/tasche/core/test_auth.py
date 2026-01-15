"""テスト用認証サービス（enable_test_auth==True の時のみ使用可能）."""

from datetime import datetime, timedelta, timezone

from jose import jwt

from tasche.core.config import settings


class TestAuthDisabledError(Exception):
    """テスト認証が無効な場合のエラー."""

    pass


class TestTokenService:
    """テスト用JWTトークン発行サービス."""

    def __init__(self):
        if not settings.enable_test_auth:
            raise TestAuthDisabledError(
                "TestTokenService requires ENABLE_TEST_AUTH=true"
            )

    def create_token(
        self,
        user_id: str,
        email: str = "test@example.com",
        expires_delta: timedelta = timedelta(hours=1),
    ) -> str:
        """テスト用JWTトークンを発行."""
        payload = {
            "sub": user_id,
            "email": email,
            "exp": datetime.now(timezone.utc) + expires_delta,
        }
        return jwt.encode(
            payload,
            settings.test_jwt_secret,
            algorithm="HS256",
        )
