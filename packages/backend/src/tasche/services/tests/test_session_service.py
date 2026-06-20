"""services/session.py のユニットテスト."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from tasche.core.config import settings
from tasche.models.session import Session
from tasche.models.user import User
from tasche.services.session import (
    _generate_raw_token,
    _generate_session_id,
    _hash_token,
    create_session,
    revoke_session,
    validate_session,
)


async def _create_test_user(db_session: AsyncSession, email: str = "test@example.com") -> User:
    """テスト用ユーザーを作成するヘルパ."""
    user = User(
        id=f"usr_{ULID()}",
        email=email,
        name="Test User",
    )
    db_session.add(user)
    await db_session.commit()
    return user


class TestCreateSession:
    """create_session のテスト."""

    @pytest.mark.asyncio
    async def test_create_session_returns_session_and_raw_token(self, db_session: AsyncSession):
        """正常系: セッションが作成され、セッションと生トークンが返ることを確認."""
        user = await _create_test_user(db_session)

        session, raw_token = await create_session(db_session, user_id=user.id)
        await db_session.commit()

        assert session is not None
        assert raw_token is not None
        assert session.id.startswith("ses_")
        assert session.user_id == user.id
        assert session.revoked_at is None
        assert session.expires_at > datetime.now(tz=timezone.utc)

        # DB にハッシュが保存されていること（生トークンではない）
        token_hash = _hash_token(raw_token)
        assert session.token_hash == token_hash
        assert session.token_hash != raw_token

    @pytest.mark.asyncio
    async def test_create_session_expires_in_configured_seconds(self, db_session: AsyncSession):
        """有効期限が session_expires_seconds 後になっていることを確認."""
        user = await _create_test_user(db_session, email="expire_test@example.com")

        before = datetime.now(tz=timezone.utc)
        session, _ = await create_session(db_session, user_id=user.id)
        after = datetime.now(tz=timezone.utc)

        expected_min = before + timedelta(seconds=settings.session_expires_seconds - 1)
        expected_max = after + timedelta(seconds=settings.session_expires_seconds + 1)

        assert expected_min <= session.expires_at <= expected_max


class TestValidateSession:
    """validate_session のテスト."""

    @pytest.mark.asyncio
    async def test_valid_session_returns_session(self, db_session: AsyncSession):
        """正常系: 有効なセッショントークンで Session が返ることを確認."""
        user = await _create_test_user(db_session, email="valid@example.com")
        session, raw_token = await create_session(db_session, user_id=user.id)
        await db_session.commit()

        result_session, extended = await validate_session(db_session, raw_token)

        assert result_session is not None
        assert result_session.id == session.id
        assert result_session.user_id == user.id

    @pytest.mark.asyncio
    async def test_invalid_token_returns_none(self, db_session: AsyncSession):
        """不正なトークンで None が返ることを確認."""
        result_session, extended = await validate_session(db_session, "invalid_token")

        assert result_session is None
        assert extended is False

    @pytest.mark.asyncio
    async def test_expired_session_returns_none(self, db_session: AsyncSession):
        """期限切れセッションで None が返ることを確認."""
        user = await _create_test_user(db_session, email="expired@example.com")

        # 期限切れセッションを直接作成
        raw_token = _generate_raw_token()
        token_hash = _hash_token(raw_token)
        expired_at = datetime.now(tz=timezone.utc) - timedelta(hours=1)
        session = Session(
            id=_generate_session_id(),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expired_at,
        )
        db_session.add(session)
        await db_session.commit()

        result_session, extended = await validate_session(db_session, raw_token)

        assert result_session is None
        assert extended is False

    @pytest.mark.asyncio
    async def test_revoked_session_returns_none(self, db_session: AsyncSession):
        """revoke 済みセッションで None が返ることを確認."""
        user = await _create_test_user(db_session, email="revoked@example.com")

        # revoke 済みセッションを作成
        raw_token = _generate_raw_token()
        token_hash = _hash_token(raw_token)
        expires_at = datetime.now(tz=timezone.utc) + timedelta(
            seconds=settings.session_expires_seconds
        )
        session = Session(
            id=_generate_session_id(),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            revoked_at=datetime.now(tz=timezone.utc),
        )
        db_session.add(session)
        await db_session.commit()

        result_session, extended = await validate_session(db_session, raw_token)

        assert result_session is None
        assert extended is False

    @pytest.mark.asyncio
    async def test_sliding_extension_when_remaining_less_than_half(self, db_session: AsyncSession):
        """残存時間 < 有効期限の半分のとき延長されることを確認."""
        user = await _create_test_user(db_session, email="sliding@example.com")

        # 残存 1 日（< 半分 3.5 日）のセッションを作成
        expires_at = datetime.now(tz=timezone.utc) + timedelta(days=1)
        raw_token = _generate_raw_token()
        token_hash = _hash_token(raw_token)
        session = Session(
            id=_generate_session_id(),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db_session.add(session)
        await db_session.commit()

        original_expires_at = session.expires_at
        result_session, extended = await validate_session(db_session, raw_token)

        assert result_session is not None
        assert extended is True
        assert result_session.expires_at > original_expires_at

    @pytest.mark.asyncio
    async def test_no_extension_when_remaining_more_than_half(self, db_session: AsyncSession):
        """残存時間 >= 有効期限の半分のとき延長されないことを確認."""
        user = await _create_test_user(db_session, email="no_slide@example.com")

        # 残存 5 日（> 半分 3.5 日）のセッションを作成
        expires_at = datetime.now(tz=timezone.utc) + timedelta(days=5)
        raw_token = _generate_raw_token()
        token_hash = _hash_token(raw_token)
        session = Session(
            id=_generate_session_id(),
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db_session.add(session)
        await db_session.commit()

        original_expires_at = session.expires_at
        result_session, extended = await validate_session(db_session, raw_token)

        assert result_session is not None
        assert extended is False
        assert result_session.expires_at == original_expires_at


class TestRevokeSession:
    """revoke_session のテスト."""

    @pytest.mark.asyncio
    async def test_revoke_valid_session(self, db_session: AsyncSession):
        """正常系: 有効なセッションを revoke できることを確認."""
        user = await _create_test_user(db_session, email="revoke_valid@example.com")
        _, raw_token = await create_session(db_session, user_id=user.id)
        await db_session.commit()

        await revoke_session(db_session, raw_token)

        # revoke 後は None が返ることを確認
        result_session, _ = await validate_session(db_session, raw_token)
        assert result_session is None

    @pytest.mark.asyncio
    async def test_revoke_none_is_noop(self, db_session: AsyncSession):
        """None を渡しても何もしないことを確認（冪等性）."""
        # 例外が発生しないことを確認
        await revoke_session(db_session, None)

    @pytest.mark.asyncio
    async def test_revoke_nonexistent_token_is_noop(self, db_session: AsyncSession):
        """存在しないトークンでも例外が発生しないことを確認."""
        await revoke_session(db_session, "nonexistent_token_value")

    @pytest.mark.asyncio
    async def test_revoke_already_revoked_is_noop(self, db_session: AsyncSession):
        """既に revoke 済みのセッションへの revoke が冪等なことを確認."""
        user = await _create_test_user(db_session, email="double_revoke@example.com")
        _, raw_token = await create_session(db_session, user_id=user.id)
        await db_session.commit()

        # 1回目の revoke
        await revoke_session(db_session, raw_token)
        # 2回目の revoke（例外が発生しないこと）
        await revoke_session(db_session, raw_token)
