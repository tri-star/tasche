"""認証スキーマ."""

from pydantic import BaseModel, EmailStr


class AuthorizeResponse(BaseModel):
    """Google認可URLレスポンス."""

    authorization_url: str
    state: str


class GoogleCallbackRequest(BaseModel):
    """Googleコールバックリクエスト."""

    code: str
    code_verifier: str
    redirect_uri: str
    state: str  # 受け取るが backend は検証しない（frontend の責務）


class LogoutResponse(BaseModel):
    """ログアウトレスポンス."""

    message: str


class StubLoginRequest(BaseModel):
    """スタブログインリクエスト."""

    email: EmailStr
    name: str | None = None
