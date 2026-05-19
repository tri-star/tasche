"""認証エンドポイント（Google OAuth 2.0 + スタブログイン）."""

import logging

from fastapi import APIRouter, Cookie, Response

from tasche.api.deps import DbSession
from tasche.core.config import settings
from tasche.core.cookies import REFRESH_TOKEN_COOKIE, clear_refresh_cookie, set_refresh_cookie
from tasche.core.env import is_auth_stub_enabled
from tasche.core.exceptions import ValidationError
from tasche.schemas.auth import (
    AuthorizeResponse,
    GoogleCallbackRequest,
    LogoutResponse,
    StubLoginRequest,
    TokenResponse,
)
from tasche.schemas.common import APIResponse
from tasche.services.auth import (
    build_authorize_url,
    handle_google_callback,
    revoke_refresh_token,
    rotate_refresh_token,
    stub_login,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/google/authorize", response_model=APIResponse[AuthorizeResponse])
async def google_authorize(
    code_challenge: str,
    redirect_uri: str,
    code_challenge_method: str = "S256",
):
    """Google 認可 URL を組み立てて返す.

    Args:
        code_challenge: frontend が生成した PKCE challenge（S256）
        redirect_uri: frontend のコールバック URL（許可リストで検証）
        code_challenge_method: S256 のみ受理（省略時も S256）

    Returns:
        APIResponse[AuthorizeResponse]: authorization_url と state
    """
    # code_challenge_method チェック
    if code_challenge_method != "S256":
        raise ValidationError("code_challenge_method must be S256")

    # redirect_uri 許可リスト検証
    if redirect_uri not in settings.google_oauth_redirect_uri_list:
        logger.warning("redirect_uri not allowed: %r", redirect_uri)
        raise ValidationError("redirect_uri is not allowed")

    authorization_url, state = await build_authorize_url(
        redirect_uri=redirect_uri,
        code_challenge=code_challenge,
        code_challenge_method=code_challenge_method,
    )

    return APIResponse(
        data=AuthorizeResponse(
            authorization_url=authorization_url,
            state=state,
        )
    )


@router.post("/google/callback", response_model=APIResponse[TokenResponse])
async def google_callback(
    body: GoogleCallbackRequest,
    response: Response,
    db: DbSession,
):
    """Google コールバック処理.

    code と code_verifier を受け取り、Google にトークン交換 → ID Token 検証
    → ユーザー upsert → 自前 JWT 発行。

    Args:
        body: GoogleCallbackRequest（code, code_verifier, redirect_uri, state）
        response: FastAPI Response（Cookie 設定用）
        db: データベースセッション

    Returns:
        APIResponse[TokenResponse]: アクセストークン
    """
    logger.info("google_callback: received redirect_uri=%r", body.redirect_uri)
    # redirect_uri 許可リスト検証
    if body.redirect_uri not in settings.google_oauth_redirect_uri_list:
        logger.warning("redirect_uri not allowed: %r", body.redirect_uri)
        raise ValidationError("redirect_uri is not allowed")

    _user, access_token, raw_refresh_token = await handle_google_callback(
        db,
        code=body.code,
        code_verifier=body.code_verifier,
        redirect_uri=body.redirect_uri,
    )

    set_refresh_cookie(response, raw_refresh_token)

    return APIResponse(
        data=TokenResponse(
            access_token=access_token,
            token_type="Bearer",
            expires_in=settings.jwt_access_token_expires_seconds,
        )
    )


@router.post("/refresh", response_model=APIResponse[TokenResponse])
async def refresh(
    response: Response,
    db: DbSession,
    refresh_token: str | None = Cookie(None, alias=REFRESH_TOKEN_COOKIE),
):
    """アクセストークンを再発行し、リフレッシュトークンをローテーションする.

    Args:
        response: FastAPI Response（Cookie 設定用）
        db: データベースセッション
        refresh_token: リフレッシュトークン（Cookie から取得）

    Returns:
        APIResponse[TokenResponse]: 新しいアクセストークン
    """
    from tasche.core.exceptions import InvalidRefreshTokenError

    if not refresh_token:
        raise InvalidRefreshTokenError("Refresh token not found in cookie")

    _user, access_token, new_raw_refresh_token = await rotate_refresh_token(
        db,
        raw_token=refresh_token,
    )

    set_refresh_cookie(response, new_raw_refresh_token)

    return APIResponse(
        data=TokenResponse(
            access_token=access_token,
            token_type="Bearer",
            expires_in=settings.jwt_access_token_expires_seconds,
        )
    )


@router.post("/logout", response_model=APIResponse[LogoutResponse])
async def logout(
    response: Response,
    db: DbSession,
    refresh_token: str | None = Cookie(None, alias=REFRESH_TOKEN_COOKIE),
):
    """ログアウト（Refresh Token を revoke し Cookie を削除する）.

    Cookie が無くても 200 を返す（冪等）。

    Args:
        response: FastAPI Response（Cookie 削除用）
        db: データベースセッション
        refresh_token: リフレッシュトークン（Cookie から取得、無くても可）

    Returns:
        APIResponse[LogoutResponse]: ログアウト完了メッセージ
    """
    await revoke_refresh_token(db, raw_token=refresh_token)
    clear_refresh_cookie(response)

    return APIResponse(data=LogoutResponse(message="ログアウトしました"))


# スタブログインエンドポイントは is_auth_stub_enabled() が true の場合のみ登録
if is_auth_stub_enabled(settings.app_env, settings.auth_stub_enabled):

    @router.post("/stub-login", response_model=APIResponse[TokenResponse])
    async def stub_login_endpoint(
        body: StubLoginRequest,
        response: Response,
        db: DbSession,
    ):
        """スタブログイン（開発・テスト環境のみ）.

        Google 認証なしでログインし、スタブ JWT を発行する。

        Args:
            body: StubLoginRequest（email, name）
            response: FastAPI Response（Cookie 設定用）
            db: データベースセッション

        Returns:
            APIResponse[TokenResponse]: スタブアクセストークン
        """
        _user, access_token, raw_refresh_token = await stub_login(
            db,
            email=str(body.email),
            name=body.name,
        )

        set_refresh_cookie(response, raw_refresh_token)

        return APIResponse(
            data=TokenResponse(
                access_token=access_token,
                token_type="Bearer",
                expires_in=settings.jwt_access_token_expires_seconds,
            )
        )
