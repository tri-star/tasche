"""core/security.py のユニットテスト（セッション Cookie 認証）."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.exceptions import InvalidTokenError
from tasche.core.security import get_current_user_sub
from tasche.models.session import Session
from tasche.models.user import User
from tasche.services.session import _generate_raw_token, _generate_session_id, _hash_token


class TestGetCurrentUserSub:
    """get_current_user_sub 依存関数のテスト."""

    @pytest.mark.asyncio
    async def test_valid_session_returns_user_id(self, db_session: AsyncSession):
        """有効な session Cookie で user_id が返ることを確認."""
        from fastapi import Response
        from ulid import ULID

        from tasche.core.config import settings

        # テスト用ユーザーを作成
        user = User(
            id=f"usr_{ULID()}",
            email="session_test@example.com",
            name="Session Test",
        )
        db_session.add(user)
        await db_session.commit()

        # 有効なセッションを直接作成
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
        )
        db_session.add(session)
        await db_session.commit()

        # get_current_user_sub を呼び出す
        response = Response()
        result = await get_current_user_sub(
            response=response,
            db=db_session,
            session_token=raw_token,
        )
        assert result == user.id

    @pytest.mark.asyncio
    async def test_no_session_cookie_raises_invalid_token(self, db_session: AsyncSession):
        """Cookie 無しで InvalidTokenError が raise されることを確認."""
        from fastapi import Response

        response = Response()
        with pytest.raises(InvalidTokenError):
            await get_current_user_sub(
                response=response,
                db=db_session,
                session_token=None,
            )

    @pytest.mark.asyncio
    async def test_invalid_token_raises_invalid_token(self, db_session: AsyncSession):
        """不正な session トークンで InvalidTokenError が raise されることを確認."""
        from fastapi import Response

        response = Response()
        with pytest.raises(InvalidTokenError):
            await get_current_user_sub(
                response=response,
                db=db_session,
                session_token="invalid_token_value",
            )

    @pytest.mark.asyncio
    async def test_expired_session_raises_invalid_token(self, db_session: AsyncSession):
        """期限切れセッションで InvalidTokenError が raise されることを確認."""
        from fastapi import Response
        from ulid import ULID

        # テスト用ユーザーを作成
        user = User(
            id=f"usr_{ULID()}",
            email="expired_test@example.com",
            name="Expired Test",
        )
        db_session.add(user)
        await db_session.commit()

        # 期限切れセッションを作成
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

        response = Response()
        with pytest.raises(InvalidTokenError):
            await get_current_user_sub(
                response=response,
                db=db_session,
                session_token=raw_token,
            )

    @pytest.mark.asyncio
    async def test_revoked_session_raises_invalid_token(self, db_session: AsyncSession):
        """revoke 済みセッションで InvalidTokenError が raise されることを確認."""
        from fastapi import Response
        from ulid import ULID

        from tasche.core.config import settings

        # テスト用ユーザーを作成
        user = User(
            id=f"usr_{ULID()}",
            email="revoked_test@example.com",
            name="Revoked Test",
        )
        db_session.add(user)
        await db_session.commit()

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

        response = Response()
        with pytest.raises(InvalidTokenError):
            await get_current_user_sub(
                response=response,
                db=db_session,
                session_token=raw_token,
            )


class TestSlidingExtension:
    """スライディング延長のテスト（services/session.py の validate_session）."""

    @pytest.mark.asyncio
    async def test_session_extended_when_remaining_less_than_half(self, db_session: AsyncSession):
        """残存時間 < 有効期限の半分のセッションが延長されることを確認."""
        from ulid import ULID

        from tasche.core.config import settings
        from tasche.services.session import validate_session

        # テスト用ユーザーを作成
        user = User(
            id=f"usr_{ULID()}",
            email="extend_test@example.com",
            name="Extend Test",
        )
        db_session.add(user)
        await db_session.commit()

        # 残存時間が半分未満のセッションを作成
        # 有効期限 7 日（604800 秒）の半分 = 3.5 日 = 302400 秒
        # 残存 1 日（86400 秒）< 半分 → 延長される
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

        # validate_session を呼び出す
        result_session, extended = await validate_session(db_session, raw_token)

        assert result_session is not None
        assert extended is True
        # expires_at が延長されていることを確認
        assert result_session.expires_at > original_expires_at
        # 延長後の expires_at が session_expires_seconds 後になっていること
        expected_expires = datetime.now(tz=timezone.utc) + timedelta(
            seconds=settings.session_expires_seconds - 60  # 1分の誤差を許容
        )
        assert result_session.expires_at >= expected_expires

    @pytest.mark.asyncio
    async def test_session_not_extended_when_remaining_more_than_half(
        self, db_session: AsyncSession
    ):
        """残存時間 >= 有効期限の半分のセッションが延長されないことを確認."""
        from ulid import ULID

        from tasche.services.session import validate_session

        # テスト用ユーザーを作成
        user = User(
            id=f"usr_{ULID()}",
            email="no_extend_test@example.com",
            name="No Extend Test",
        )
        db_session.add(user)
        await db_session.commit()

        # 残存時間が半分以上のセッションを作成
        # 有効期限 7 日（604800 秒）の半分 = 3.5 日
        # 残存 5 日（432000 秒）> 半分 → 延長されない
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

        # validate_session を呼び出す
        result_session, extended = await validate_session(db_session, raw_token)

        assert result_session is not None
        assert extended is False
        # expires_at が変わっていないことを確認（秒単位で同じ）
        assert result_session.expires_at == original_expires_at
