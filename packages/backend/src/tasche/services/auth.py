"""認証サービス（Google OAuth トークン交換・セッション発行）."""

import logging

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.exceptions import InvalidAuthorizationCodeError
from tasche.core.oauth import (
    build_google_authorize_url,
    exchange_code_for_token,
    verify_google_id_token,
)
from tasche.models.user import User
from tasche.services.session import create_session
from tasche.services.user import get_or_create_user_by_email, get_or_create_user_by_google_sub
from tasche.services.week import ensure_current_week

logger = logging.getLogger(__name__)


async def build_authorize_url(
    *,
    redirect_uri: str,
    code_challenge: str,
    code_challenge_method: str,
    state: str,
) -> tuple[str, str]:
    """Google 認可 URL を組み立てる.

    state はフロントエンドが生成した値を受け取り、そのまま Google 認可 URL に埋め込む（RFC 6819 推奨）。

    Returns:
        (authorization_url, state)
    """
    authorization_url = build_google_authorize_url(
        redirect_uri=redirect_uri,
        state=state,
        code_challenge=code_challenge,
    )
    return authorization_url, state


async def handle_google_callback(
    db: AsyncSession,
    *,
    code: str,
    code_verifier: str,
    redirect_uri: str,
) -> tuple[User, str]:
    """Google コールバックを処理してユーザー・セッショントークンを返す.

    Returns:
        (user, raw_session_token)

    Raises:
        InvalidAuthorizationCodeError: Google /token が 4xx / ID Token 検証失敗 / email_verified=false
    """
    logger.debug("handle_google_callback: start redirect_uri=%r", redirect_uri)
    # Google にトークン交換リクエスト
    try:
        token_response = await exchange_code_for_token(
            code=code,
            code_verifier=code_verifier,
            redirect_uri=redirect_uri,
        )
    except httpx.HTTPStatusError as e:
        logger.warning(
            "Google token exchange HTTP error: status=%d body=%r",
            e.response.status_code,
            e.response.text[:200],
        )
        raise InvalidAuthorizationCodeError("Failed to exchange authorization code") from e
    except httpx.RequestError as e:
        logger.error("Google token exchange network error: %s", type(e).__name__)
        raise InvalidAuthorizationCodeError("Failed to exchange authorization code") from e
    except Exception as e:
        logger.error("Google token exchange unexpected error: %s", type(e).__name__)
        raise InvalidAuthorizationCodeError("Failed to exchange authorization code") from e

    logger.debug("handle_google_callback: token exchange succeeded")
    # ID Token を検証
    id_token = token_response.get("id_token")
    if not id_token:
        raise InvalidAuthorizationCodeError("No id_token in Google response")

    claims = await verify_google_id_token(id_token)
    logger.debug("handle_google_callback: ID token verified sub=%r", claims.get("sub"))

    # ユーザーを upsert
    google_sub = claims["sub"]
    email = claims.get("email", "")
    name = claims.get("name")
    picture = claims.get("picture")

    user = await get_or_create_user_by_google_sub(
        db,
        google_sub=google_sub,
        email=email,
        name=name,
        picture=picture,
    )

    # current week を保証する（新規登録ユーザーの場合は週レコードを作成）
    await ensure_current_week(db, user)

    # セッション発行
    _session, raw_session_token = await create_session(db, user_id=user.id)
    logger.info("Google OAuth login succeeded: user_id=%s", user.id)

    return user, raw_session_token


async def stub_login(
    db: AsyncSession,
    *,
    email: str,
    name: str | None,
) -> tuple[User, str]:
    """スタブログイン（is_auth_stub_enabled が true のときのみ呼ばれる前提）.

    Returns:
        (user, raw_session_token)
    """
    user = await get_or_create_user_by_email(db, email=email, name=name)

    # current week を保証する（新規登録ユーザーの場合は週レコードを作成）
    await ensure_current_week(db, user)

    # セッション発行
    _session, raw_session_token = await create_session(db, user_id=user.id)

    return user, raw_session_token
