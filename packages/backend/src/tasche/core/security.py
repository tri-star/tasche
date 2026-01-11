"""JWT 検証（Auth0 + テスト用フォールバック）."""
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from tasche.core.config import settings

security = HTTPBearer()


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
        except HTTPException as e:
            # テスト用JWT検証失敗時は、そのままエラーを返す（Auth0にフォールバックしない）
            raise e

    # TODO: Auth0 JWT 検証実装（将来）
    # 現在はテスト用のみ対応
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Auth0 verification not implemented yet",
    )
