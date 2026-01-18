"""JWT 検証（Auth0 + テスト用フォールバック）."""

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from tasche.core.config import settings

security = HTTPBearer()

# JWKSキャッシュ（シンプルな実装）
_jwks_cache: dict | None = None


async def get_jwks() -> dict:
    """Auth0 JWKSを取得（キャッシュ付き）."""
    global _jwks_cache

    if _jwks_cache is not None:
        return _jwks_cache

    # JWKSエンドポイントから公開鍵を取得
    jwks_url = f"https://{settings.auth0_domain}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
        return _jwks_cache


def decode_test_jwt(token: str) -> dict:
    """テスト用 JWT デコード."""
    try:
        payload = jwt.decode(
            token,
            settings.test_jwt_secret,
            algorithms=["HS256"],
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid test token: {e}",
        ) from e


async def decode_auth0_jwt(token: str) -> dict:
    """Auth0 JWT デコード（RS256検証）."""
    try:
        # JWTヘッダーからkidを取得
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token does not contain 'kid' in header",
            )

        # JWKSから対応する公開鍵を取得
        jwks = await get_jwks()
        rsa_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate key",
            )

        # RS256でトークンを検証
        issuer = f"https://{settings.auth0_domain}/"
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=issuer,
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Auth0 token: {e}",
        ) from e
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch JWKS: {e}",
        ) from e


async def get_current_user_sub(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """現在のユーザーのsubを取得（Auth0 or テスト用）."""
    token = credentials.credentials

    # テスト認証が有効な場合、テスト用トークンを優先
    if settings.enable_test_auth:
        try:
            payload = decode_test_jwt(token)
            sub = payload.get("sub", "")
            if not sub:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token does not contain 'sub' claim",
                )
            return sub
        except HTTPException:
            # テスト用JWT検証失敗時は、そのままエラーを返す（Auth0にフォールバックしない）
            raise

    # Auth0 JWT 検証
    payload = await decode_auth0_jwt(token)
    sub = payload.get("sub", "")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain 'sub' claim",
        )
    return sub
