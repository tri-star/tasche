"""認証エンドポイント."""

import logging

from authlib.integrations.base_client.errors import OAuthError
from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status

from tasche.api.deps import CurrentUser, DbSession
from tasche.core.config import settings
from tasche.core.oauth import oauth
from tasche.schemas.auth import (
    Auth0UserInfo,
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
AUTH_COOKIE_PATH = "/api/auth"


@router.get("/login")
async def login(request: Request):
    """ログイン開始.

    Auth0のauthorizeエンドポイントにリダイレクトする。
    state, PKCE (code_verifier/challenge) はauthlibが自動管理。

    Args:
        request: FastAPIリクエスト

    Returns:
        RedirectResponse: Auth0 authorize URLへのリダイレクト
    """
    redirect_uri = str(request.url_for("auth_callback"))
    return await oauth.auth0.authorize_redirect(request, redirect_uri)


@router.get("/callback", response_model=APIResponse[TokenResponse])
async def auth_callback(request: Request, response: Response, db: DbSession):
    """認証コールバック.

    authlibがstate検証、PKCE検証、トークン交換を自動実行。
    ユーザー情報を取得してDBに保存/更新する。
    Refresh TokenはHttpOnly Cookieに保存し、Access Tokenはレスポンスで返す。

    Args:
        request: 認証コールバックリクエスト
        response: FastAPIレスポンス（Cookie設定用）
        db: データベースセッション

    Returns:
        APIResponse[TokenResponse]: トークンレスポンス
    """
    try:
        # 1. authlibでトークン取得（state検証、PKCE検証も自動）
        token = await oauth.auth0.authorize_access_token(request)

        access_token = token["access_token"]
        refresh_token = token.get("refresh_token")
        userinfo = token.get("userinfo")

        # 2. userinfoがない場合は別途取得
        if not userinfo:
            userinfo_dict = await auth0_service.get_userinfo(access_token)
        else:
            # authlibから取得したuserinfoをPydanticモデルに変換
            userinfo_dict = Auth0UserInfo(**userinfo)

        # 3. DBにユーザーを保存/更新
        await get_or_create_user_from_auth0(db, userinfo_dict)

        # 4. Refresh TokenをCookieに保存
        if refresh_token:
            response.set_cookie(
                key=REFRESH_TOKEN_COOKIE_NAME,
                value=refresh_token,
                max_age=REFRESH_TOKEN_MAX_AGE,
                httponly=True,
                secure=settings.cookie_secure,
                samesite=settings.cookie_samesite,
                path=AUTH_COOKIE_PATH,
            )

        # 5. Access Tokenをレスポンスで返す
        return APIResponse(
            data=TokenResponse(
                access_token=access_token,
                token_type=token.get("token_type", "Bearer"),
                expires_in=token.get("expires_in", 3600),
            )
        )

    except OAuthError as e:
        logger.error(f"OAuth error during callback: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth authentication failed: {e.error}",
        ) from e
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
                path=AUTH_COOKIE_PATH,
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
