"""認証スキーマ."""

from pydantic import BaseModel, EmailStr


class TestTokenRequest(BaseModel):
    """テスト用トークン発行リクエスト."""

    email: EmailStr | None = None
    user_id: str | None = None
    expires_in: int | None = None


class TestTokenResponse(BaseModel):
    """テスト用トークン発行レスポンス."""

    access_token: str
    token_type: str = "Bearer"
