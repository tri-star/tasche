"""JWT 発行・検証（自前 HS256 + スタブフォールバック）."""

from datetime import datetime, timezone

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import OctKey
from joserfc.jwt import JWTClaimsRegistry

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
    secret_bytes = (
        settings.jwt_secret.encode()
        if isinstance(settings.jwt_secret, str)
        else settings.jwt_secret
    )
    key = OctKey.import_key(secret_bytes)
    token = jwt.encode({"alg": settings.jwt_algorithm}, payload, key)
    return token, settings.jwt_access_token_expires_seconds


def issue_stub_access_token(*, user_id: str, email: str) -> tuple[str, int]:
    """スタブ用 HS256 JWT を発行する（stub=True クレーム付き）.

    Returns:
        (access_token, expires_in_seconds)
    """
    now = int(datetime.now(tz=timezone.utc).timestamp())
    exp = now + settings.jwt_access_token_expires_seconds
    payload = {"sub": user_id, "email": email, "iat": now, "exp": exp, "stub": True}
    secret_bytes = (
        settings.auth_stub_jwt_secret.encode()
        if isinstance(settings.auth_stub_jwt_secret, str)
        else settings.auth_stub_jwt_secret
    )
    key = OctKey.import_key(secret_bytes)
    token = jwt.encode({"alg": "HS256"}, payload, key)
    return token, settings.jwt_access_token_expires_seconds


def _decode_app_jwt(token: str) -> dict:
    """自前 JWT をデコード・検証する."""
    secret_bytes = (
        settings.jwt_secret.encode()
        if isinstance(settings.jwt_secret, str)
        else settings.jwt_secret
    )
    key = OctKey.import_key(secret_bytes)
    decoded = jwt.decode(token, key, algorithms=[settings.jwt_algorithm])
    JWTClaimsRegistry(leeway=60, exp={"essential": True}).validate(decoded.claims)
    return decoded.claims


def _decode_stub_jwt(token: str) -> dict:
    """スタブ JWT をデコード・検証する（stub クレーム必須）."""
    secret_bytes = (
        settings.auth_stub_jwt_secret.encode()
        if isinstance(settings.auth_stub_jwt_secret, str)
        else settings.auth_stub_jwt_secret
    )
    key = OctKey.import_key(secret_bytes)
    decoded = jwt.decode(token, key, algorithms=["HS256"])
    JWTClaimsRegistry(leeway=60, exp={"essential": True}).validate(decoded.claims)
    claims = decoded.claims
    if not claims.get("stub"):
        raise JoseError("not a stub token")
    return claims


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
    except JoseError:
        if is_auth_stub_enabled(settings.app_env, settings.auth_stub_enabled):
            try:
                payload = _decode_stub_jwt(token)
            except JoseError as e:
                raise InvalidTokenError("Invalid token") from e
        else:
            raise InvalidTokenError("Invalid token")

    sub = payload.get("sub")
    if not sub:
        raise InvalidTokenError("Token does not contain 'sub' claim")
    return sub
