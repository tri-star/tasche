"""認証サービス（Google OAuth トークン交換・JWT 発行・Refresh Token 管理）."""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.core.config import settings
from tasche.core.exceptions import InvalidAuthorizationCodeError, InvalidRefreshTokenError
from tasche.core.oauth import (
    build_google_authorize_url,
    exchange_code_for_token,
    generate_state,
    verify_google_id_token,
)
from tasche.core.security import issue_access_token, issue_stub_access_token
from tasche.models.refresh_token import RefreshToken
from tasche.models.user import User
from tasche.services.user import get_or_create_user_by_email, get_or_create_user_by_google_sub
from tasche.services.week import ensure_current_week

logger = logging.getLogger(__name__)


def _generate_refresh_token_id() -> str:
    """ULID形式のリフレッシュトークンIDを生成する（rft_ プレフィックス付き）."""
    return f"rft_{ULID()}"


def _hash_token(raw_token: str) -> str:
    """トークンをSHA-256でハッシュ化する."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _generate_raw_refresh_token() -> str:
    """不透明なリフレッシュトークンを生成する."""
    return secrets.token_urlsafe(48)


async def _create_refresh_token(
    db: AsyncSession,
    *,
    user_id: str,
    rotated_from_id: str | None = None,
    expires_seconds: int,
) -> tuple[RefreshToken, str]:
    """リフレッシュトークンをDBに作成する.

    Returns:
        (RefreshToken, raw_token)
    """

    raw_token = _generate_raw_refresh_token()
    token_hash = _hash_token(raw_token)
    token_id = _generate_refresh_token_id()
    expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=expires_seconds)

    refresh_token = RefreshToken(
        id=token_id,
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked_at=None,
        rotated_from_id=rotated_from_id,
        rotated_to_id=None,
    )
    db.add(refresh_token)
    await db.flush()  # ID を確定させるためにフラッシュ

    return refresh_token, raw_token


async def build_authorize_url(
    *,
    redirect_uri: str,
    code_challenge: str,
    code_challenge_method: str,
) -> tuple[str, str]:
    """Google 認可 URL を組み立てる.

    Returns:
        (authorization_url, state)
    """
    state = generate_state()
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
) -> tuple[User, str, str]:
    """Google コールバックを処理してユーザー・トークンを返す.

    Returns:
        (user, access_token, raw_refresh_token)

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

    # 自前 JWT 発行
    access_token, _ = issue_access_token(user_id=user.id, email=user.email)

    # リフレッシュトークン発行
    refresh_token_record, raw_refresh_token = await _create_refresh_token(
        db,
        user_id=user.id,
        expires_seconds=settings.jwt_refresh_token_expires_seconds,
    )
    await db.commit()
    logger.info("Google OAuth login succeeded: user_id=%s", user.id)

    return user, access_token, raw_refresh_token


async def rotate_refresh_token(
    db: AsyncSession,
    *,
    raw_token: str,
) -> tuple[User, str, str]:
    """リフレッシュトークンをローテーションする.

    Returns:
        (user, access_token, new_raw_refresh_token)

    Raises:
        InvalidRefreshTokenError: Cookie 不在、hash 一致無し、期限切れ、revoke 済
    """
    token_hash = _hash_token(raw_token)
    now = datetime.now(tz=timezone.utc)

    # DB から検索
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    token_record = result.scalar_one_or_none()

    if not token_record:
        raise InvalidRefreshTokenError("Refresh token not found")

    # 期限切れチェック（SQLite では naive datetime が返る場合があるため UTC として扱う）
    expires_at = token_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise InvalidRefreshTokenError("Refresh token has expired")

    # 再利用検知（既に revoke 済みのトークンが使われた）
    if token_record.revoked_at is not None:
        logger.warning(
            "Refresh token reuse detected (possible token theft): user_id=%s, token_id=%s",
            token_record.user_id,
            token_record.id,
        )
        # 同 user_id の全リフレッシュトークンを一斉 revoke
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == token_record.user_id)
            .where(RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await db.commit()
        raise InvalidRefreshTokenError("Refresh token has been reused (security violation)")

    # ユーザー取得
    result = await db.execute(select(User).where(User.id == token_record.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise InvalidRefreshTokenError("User not found for refresh token")

    # 旧トークンを revoke
    token_record.revoked_at = now

    # 新トークンを発行
    new_token_record, new_raw_refresh_token = await _create_refresh_token(
        db,
        user_id=user.id,
        rotated_from_id=token_record.id,
        expires_seconds=settings.jwt_refresh_token_expires_seconds,
    )

    # 旧トークンに rotated_to_id を設定
    token_record.rotated_to_id = new_token_record.id

    # 自前 JWT 発行
    access_token, _ = issue_access_token(user_id=user.id, email=user.email)

    await db.commit()
    logger.info("Refresh token rotated: user_id=%s", user.id)

    return user, access_token, new_raw_refresh_token


async def revoke_refresh_token(
    db: AsyncSession,
    *,
    raw_token: str | None,
) -> None:
    """リフレッシュトークンを revoke する.

    None が渡された場合は何もしない（Cookie が無い場合の logout に対応）。
    """
    if raw_token is None:
        return

    token_hash = _hash_token(raw_token)
    now = datetime.now(tz=timezone.utc)

    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    token_record = result.scalar_one_or_none()

    if token_record and token_record.revoked_at is None:
        token_record.revoked_at = now
        await db.commit()
        logger.info("Refresh token revoked: user_id=%s", token_record.user_id)


async def stub_login(
    db: AsyncSession,
    *,
    email: str,
    name: str | None,
) -> tuple[User, str, str]:
    """スタブログイン（is_auth_stub_enabled が true のときのみ呼ばれる前提）.

    Returns:
        (user, access_token, raw_refresh_token)
    """
    user = await get_or_create_user_by_email(db, email=email, name=name)

    # current week を保証する（新規登録ユーザーの場合は週レコードを作成）
    await ensure_current_week(db, user)

    # スタブ用 JWT 発行
    access_token, _ = issue_stub_access_token(user_id=user.id, email=user.email)

    # リフレッシュトークン発行（通常フローと同じテーブルを利用）
    _, raw_refresh_token = await _create_refresh_token(
        db,
        user_id=user.id,
        expires_seconds=settings.jwt_refresh_token_expires_seconds,
    )
    await db.commit()

    return user, access_token, raw_refresh_token
