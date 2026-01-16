"""認証スキーマ."""

from pydantic import BaseModel


class TestTokenResponse(BaseModel):
    """テスト用トークン発行レスポンス."""

    access_token: str
    token_type: str = "Bearer"
