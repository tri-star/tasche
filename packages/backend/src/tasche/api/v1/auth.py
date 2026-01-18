"""認証エンドポイント."""

import logging

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status

from tasche.api.deps import CurrentUser, DbSession
from tasche.core.config import settings
from tasche.schemas.auth import (
    LogoutResponse,
    TokenResponse,
)
from tasche.schemas.common import APIResponse
from tasche.services.auth import auth0_service
from tasche.services.user import get_or_create_user_from_auth0

logger = logging.getLogger(__name__)

router = APIRouter()

# Cookie設定の定数
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"
REFRESH_TOKEN_MAX_AGE = 604800  # 7日間（秒）


@router.get("/callback", response_model=APIResponse[TokenResponse])
async def auth_callback(code: str, request: Request, response: Response, db: DbSession):
    """認証コールバック.

    Auth0の認可コードをトークンに交換し、ユーザー情報を取得してDBに保存/更新する。
    Refresh TokenはHttpOnly Cookieに保存し、Access Tokenはレスポンスで返す。

    Args:
        request: 認証コールバックリクエスト
        response: FastAPIレスポンス（Cookie設定用）
        db: データベースセッション

    Returns:
        APIResponse[TokenResponse]: トークンレスポンス
    """
    try:
        # 1. Auth0にcodeを送ってtokenを取得
        redirect_uri = str(request.url_for("auth_callback"))
        token_response = await auth0_service.exchange_code_for_tokens(
            code,
            redirect_uri,
        )

        # 2. ユーザー情報を取得
        userinfo = await auth0_service.get_userinfo(token_response.access_token)

        # 3. DBにユーザーを保存/更新
        await get_or_create_user_from_auth0(db, userinfo)

        # 4. Refresh TokenをCookieに保存
        if token_response.refresh_token:
            response.set_cookie(
                key=REFRESH_TOKEN_COOKIE_NAME,
                value=token_response.refresh_token,
                max_age=REFRESH_TOKEN_MAX_AGE,
                httponly=True,
                secure=settings.cookie_secure,
                samesite=settings.cookie_samesite,
                path="/api/auth",
            )

        # 5. Access Tokenをレスポンスで返す
        return APIResponse(
            data=TokenResponse(
                access_token=token_response.access_token,
                token_type=token_response.token_type,
                expires_in=token_response.expires_in,
            )
        )

    except Exception as e:
        logger.error(f"Failed to authenticate: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to authenticate.",
        ) from e


@router.post("/refresh", response_model=APIResponse[TokenResponse])
async def refresh_token(
    response: Response,
    refresh_token: str | None = Cookie(None, alias=REFRESH_TOKEN_COOKIE_NAME),
):
    """トークンリフレッシュ.

    Refresh Tokenで新しいトークンを取得する。
    新しいRefresh TokenもCookieに保存（Rotation）。

    Args:
        response: FastAPIレスポンス（Cookie設定用）
        refresh_token: リフレッシュトークン（Cookieから取得）

    Returns:
        APIResponse[TokenResponse]: 新しいトークンレスポンス
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    try:
        # 1. Auth0で新しいtokenを取得
        token_response = await auth0_service.refresh_tokens(refresh_token)

        # 2. 新しいRefresh TokenをCookieに保存（Rotation）
        if token_response.refresh_token:
            response.set_cookie(
                key=REFRESH_TOKEN_COOKIE_NAME,
                value=token_response.refresh_token,
                max_age=REFRESH_TOKEN_MAX_AGE,
                httponly=True,
                secure=settings.cookie_secure,
                samesite=settings.cookie_samesite,
                path="/api/auth",
            )

        # 3. 新しいAccess Tokenをレスポンスで返す
        return APIResponse(
            data=TokenResponse(
                access_token=token_response.access_token,
                token_type=token_response.token_type,
                expires_in=token_response.expires_in,
            )
        )

    except Exception as e:
        logger.error(f"Failed to refresh token: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh token.",
        ) from e


@router.post("/logout", response_model=APIResponse[LogoutResponse])
async def logout(response: Response, current_user: CurrentUser):
    """ログアウト.

    Refresh TokenのCookieを削除する。

    Args:
        response: FastAPIレスポンス（Cookie設定用）
        current_user: 現在のユーザー（認証チェック用）

    Returns:
        APIResponse[LogoutResponse]: ログアウトメッセージ
    """
    # Cookieを削除
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        path="/api/auth",
    )

    return APIResponse(data=LogoutResponse(message="ログアウトしました"))
