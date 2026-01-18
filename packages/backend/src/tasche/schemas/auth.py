"""認証スキーマ."""

from pydantic import BaseModel, EmailStr


class TestTokenResponse(BaseModel):
    """テスト用トークン発行レスポンス."""

    access_token: str
    token_type: str = "Bearer"


class AuthCallbackRequest(BaseModel):
    """認証コールバックリクエスト."""

    code: str
    redirect_uri: str


class TokenResponse(BaseModel):
    """トークンレスポンス."""

    access_token: str
    token_type: str = "Bearer"
    expires_in: int


class LogoutResponse(BaseModel):
    """ログアウトレスポンス."""

    message: str


class Auth0TokenResponse(BaseModel):
    """Auth0 トークンレスポンス（内部用）."""

    access_token: str
    refresh_token: str | None = None
    id_token: str
    token_type: str
    expires_in: int


class Auth0UserInfo(BaseModel):
    """Auth0 ユーザー情報（内部用）."""

    sub: str  # Auth0 user_id
    email: EmailStr
    name: str | None = None
    picture: str | None = None
