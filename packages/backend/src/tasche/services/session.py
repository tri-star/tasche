"""セッション管理サービス（発行/検証/revoke/スライディング延長）."""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.core.config import settings
from tasche.models.session import Session

logger = logging.getLogger(__name__)


def _generate_session_id() -> str:
    """ULID形式のセッションIDを生成する（ses_ プレフィックス付き）."""
    return f"ses_{ULID()}"


def _hash_token(raw_token: str) -> str:
    """トークンをSHA-256でハッシュ化する."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _generate_raw_token() -> str:
    """不透明なセッショントークンを生成する."""
    return secrets.token_urlsafe(48)


async def create_session(
    db: AsyncSession,
    *,
    user_id: str,
) -> tuple[Session, str]:
    """セッションをDBに作成する.

    Returns:
        (Session, raw_token) - raw_token は Cookie に設定する生トークン
    """
    raw_token = _generate_raw_token()
    token_hash = _hash_token(raw_token)
    session_id = _generate_session_id()
    expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=settings.session_expires_seconds)

    session = Session(
        id=session_id,
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        revoked_at=None,
    )
    db.add(session)
    await db.flush()  # ID を確定させるためにフラッシュ（commit は呼び出し側で行う）

    return session, raw_token


async def validate_session(
    db: AsyncSession,
    raw_token: str,
) -> tuple[Session | None, bool]:
    """セッショントークンを検証し、スライディング延長を行う.

    Args:
        db: DBセッション
        raw_token: Cookie から取得した生トークン

    Returns:
        (Session | None, bool) - Session が None の場合は無効。bool は延長が発生したか。
    """
    token_hash = _hash_token(raw_token)
    now = datetime.now(tz=timezone.utc)

    result = await db.execute(select(Session).where(Session.token_hash == token_hash))
    session = result.scalar_one_or_none()

    if session is None:
        return None, False

    # revoked チェック
    if session.revoked_at is not None:
        return None, False

    # 期限切れチェック（PostgreSQL では timezone-aware だが念のため補正）
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        return None, False

    # スライディング延長判定: 残存時間 < 有効期限の半分 なら延長
    remaining = expires_at - now
    half_lifetime = timedelta(seconds=settings.session_expires_seconds / 2)
    extended = False

    if remaining < half_lifetime:
        new_expires_at = now + timedelta(seconds=settings.session_expires_seconds)
        session.expires_at = new_expires_at
        await db.commit()
        extended = True
        logger.debug("Session extended: session_id=%s", session.id)

    return session, extended


async def revoke_session(
    db: AsyncSession,
    raw_token: str | None,
) -> None:
    """セッションを revoke する.

    None が渡された場合は何もしない（Cookie が無い場合の logout に対応）。
    """
    if raw_token is None:
        return

    token_hash = _hash_token(raw_token)
    now = datetime.now(tz=timezone.utc)

    result = await db.execute(select(Session).where(Session.token_hash == token_hash))
    session = result.scalar_one_or_none()

    if session and session.revoked_at is None:
        session.revoked_at = now
        await db.commit()
        logger.info("Session revoked: session_id=%s, user_id=%s", session.id, session.user_id)
