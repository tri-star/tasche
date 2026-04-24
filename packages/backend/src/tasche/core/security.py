"""JWT 発行・検証（自前 HS256 + スタブフォールバック）."""

from datetime import datetime, timezone

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from tasche.core.config import settings
from tasche.core.env import is_auth_stub_enabled
from tasche.core.exceptions import InvalidTokenError

security = HTTPBearer()


def issue_access_token(*, user_id: str, email: str) -> tuple[str, int]:
    """自前 JWT（HS256）を発行する.

    Returns:
        (access_token, expires_in_seconds)
    """
    now = int(datetime.now(tz=timezone.utc).timestamp())
    exp = now + settings.jwt_access_token_expires_seconds
    payload = {"sub": user_id, "email": email, "iat": now, "exp": exp}
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, settings.jwt_access_token_expires_seconds


def issue_stub_access_token(*, user_id: str, email: str) -> tuple[str, int]:
    """スタブ用 HS256 JWT を発行する（stub=True クレーム付き）.

    Returns:
        (access_token, expires_in_seconds)
    """
    now = int(datetime.now(tz=timezone.utc).timestamp())
    exp = now + settings.jwt_access_token_expires_seconds
    payload = {"sub": user_id, "email": email, "iat": now, "exp": exp, "stub": True}
    token = jwt.encode(payload, settings.auth_stub_jwt_secret, algorithm="HS256")
    return token, settings.jwt_access_token_expires_seconds


def _decode_app_jwt(token: str) -> dict:
    """自前 JWT をデコード・検証する."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def _decode_stub_jwt(token: str) -> dict:
    """スタブ JWT をデコード・検証する（stub クレーム必須）."""
    payload = jwt.decode(token, settings.auth_stub_jwt_secret, algorithms=["HS256"])
    if not payload.get("stub"):
        raise JWTError("not a stub token")
    return payload


async def get_current_user_sub(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """現在のユーザーの sub（内部ユーザーID）を取得する.

    1. 自前 JWT で検証試行。成功なら sub を返す。
    2. 失敗時、is_auth_stub_enabled() == True ならスタブ JWT で検証試行。
    3. いずれも失敗なら InvalidTokenError を raise。
    """
    token = credentials.credentials

    try:
        payload = _decode_app_jwt(token)
    except JWTError:
        if is_auth_stub_enabled(settings.app_env, settings.auth_stub_enabled):
            try:
                payload = _decode_stub_jwt(token)
            except JWTError as e:
                raise InvalidTokenError("Invalid token") from e
        else:
            raise InvalidTokenError("Invalid token")

    sub = payload.get("sub")
    if not sub:
        raise InvalidTokenError("Token does not contain 'sub' claim")
    return sub
