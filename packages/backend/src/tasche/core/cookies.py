"""Cookie ユーティリティ."""

from fastapi import Response

from tasche.core.config import settings

SESSION_COOKIE = "session"
SESSION_COOKIE_PATH = "/api"


def set_session_cookie(response: Response, raw_token: str) -> None:
    """セッショントークンを HttpOnly Cookie に設定する."""
    response.set_cookie(
        key=SESSION_COOKIE,
        value=raw_token,
        max_age=settings.session_expires_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path=SESSION_COOKIE_PATH,
        domain=settings.cookie_domain or None,
    )


def clear_session_cookie(response: Response) -> None:
    """セッション Cookie を削除する."""
    response.delete_cookie(
        key=SESSION_COOKIE,
        path=SESSION_COOKIE_PATH,
        domain=settings.cookie_domain or None,
    )
