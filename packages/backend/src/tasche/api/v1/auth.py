"""認証エンドポイント（Google OAuth 2.0 + スタブログイン）."""

import logging

from fastapi import APIRouter, Cookie, Response

from tasche.api.deps import DbSession
from tasche.core.config import settings
from tasche.core.cookies import SESSION_COOKIE, clear_session_cookie, set_session_cookie
from tasche.core.env import is_auth_stub_enabled
from tasche.core.exceptions import ValidationError
from tasche.schemas.auth import (
    AuthorizeResponse,
    GoogleCallbackRequest,
    LogoutResponse,
    StubLoginRequest,
)
from tasche.schemas.common import APIResponse
from tasche.schemas.user import UserResponse
from tasche.services.auth import (
    build_authorize_url,
    handle_google_callback,
    stub_login,
)
from tasche.services.session import revoke_session

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


@router.post("/google/callback", response_model=APIResponse[UserResponse])
async def google_callback(
    body: GoogleCallbackRequest,
    response: Response,
    db: DbSession,
):
    """Google コールバック処理.

    code と code_verifier を受け取り、Google にトークン交換 → ID Token 検証
    → ユーザー upsert → セッション発行 + Set-Cookie。

    Args:
        body: GoogleCallbackRequest（code, code_verifier, redirect_uri, state）
        response: FastAPI Response（Cookie 設定用）
        db: データベースセッション

    Returns:
        APIResponse[UserResponse]: ユーザー情報
    """
    logger.info("google_callback: received redirect_uri=%r", body.redirect_uri)
    # redirect_uri 許可リスト検証
    if body.redirect_uri not in settings.google_oauth_redirect_uri_list:
        logger.warning("redirect_uri not allowed: %r", body.redirect_uri)
        raise ValidationError("redirect_uri is not allowed")

    user, raw_session_token = await handle_google_callback(
        db,
        code=body.code,
        code_verifier=body.code_verifier,
        redirect_uri=body.redirect_uri,
    )

    set_session_cookie(response, raw_session_token)

    return APIResponse(data=UserResponse.model_validate(user))


@router.post("/logout", response_model=APIResponse[LogoutResponse])
async def logout(
    response: Response,
    db: DbSession,
    session_token: str | None = Cookie(None, alias=SESSION_COOKIE),
):
    """ログアウト（セッションを revoke し Cookie を削除する）.

    Cookie が無くても 200 を返す（冪等）。認証 dependency は不要（未認証でも 200）。

    Args:
        response: FastAPI Response（Cookie 削除用）
        db: データベースセッション
        session_token: セッショントークン（Cookie から取得、無くても可）

    Returns:
        APIResponse[LogoutResponse]: ログアウト完了メッセージ
    """
    await revoke_session(db, session_token)
    await db.commit()
    clear_session_cookie(response)

    return APIResponse(data=LogoutResponse(message="ログアウトしました"))


# スタブログインエンドポイントは is_auth_stub_enabled() が true の場合のみ登録
if is_auth_stub_enabled(settings.app_env, settings.auth_stub_enabled):

    @router.post("/stub-login", response_model=APIResponse[UserResponse])
    async def stub_login_endpoint(
        body: StubLoginRequest,
        response: Response,
        db: DbSession,
    ):
        """スタブログイン（開発・テスト環境のみ）.

        Google 認証なしでログインし、セッション Cookie を発行する。

        Args:
            body: StubLoginRequest（email, name）
            response: FastAPI Response（Cookie 設定用）
            db: データベースセッション

        Returns:
            APIResponse[UserResponse]: ユーザー情報
        """
        user, raw_session_token = await stub_login(
            db,
            email=str(body.email),
            name=body.name,
        )

        set_session_cookie(response, raw_session_token)

        return APIResponse(data=UserResponse.model_validate(user))
