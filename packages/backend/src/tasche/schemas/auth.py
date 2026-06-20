"""認証スキーマ."""

from pydantic import BaseModel, EmailStr, Field


class AuthorizeResponse(BaseModel):
    """Google認可URLレスポンス."""

    authorization_url: str
    state: str


class GoogleCallbackRequest(BaseModel):
    """Googleコールバックリクエスト."""

    code: str = Field(..., max_length=512)
    code_verifier: str = Field(..., max_length=512)
    redirect_uri: str = Field(..., max_length=512)
    state: str = Field(..., max_length=512)  # 受け取るが backend は検証しない（frontend の責務）


class LogoutResponse(BaseModel):
    """ログアウトレスポンス."""

    message: str


class StubLoginRequest(BaseModel):
    """スタブログインリクエスト."""

    email: EmailStr
    name: str | None = None
