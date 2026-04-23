"""Cookie ユーティリティ."""

from fastapi import Response

from tasche.core.config import settings

REFRESH_TOKEN_COOKIE = "refresh_token"
REFRESH_TOKEN_PATH = "/api/auth"


def set_refresh_cookie(response: Response, raw_token: str) -> None:
    """リフレッシュトークンを HttpOnly Cookie に設定する."""
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=raw_token,
        max_age=settings.jwt_refresh_token_expires_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path=REFRESH_TOKEN_PATH,
        domain=settings.cookie_domain or None,
    )


def clear_refresh_cookie(response: Response) -> None:
    """リフレッシュトークン Cookie を削除する."""
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path=REFRESH_TOKEN_PATH,
        domain=settings.cookie_domain or None,
    )
