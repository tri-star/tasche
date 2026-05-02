"""ユーザーサービスの統合テスト（実DBを使用）（TCH-32: email_verified_at 関連）."""

from datetime import datetime, timezone

import pytest
from ulid import ULID

from tasche.core.exceptions import InvalidAuthorizationCodeError
from tasche.services.user import (
    create_user,
    get_or_create_user_by_email,
    get_or_create_user_by_google_sub,
)


def _make_user_id() -> str:
    return f"usr_{ULID()}"


# ============================================================
# ケース1: 新規ユーザー（Google 経由）作成時に email_verified_at がセットされる
# ============================================================


class TestGetOrCreateUserByGoogleSub:
    """get_or_create_user_by_google_sub のテスト."""

    async def test_new_user_has_email_verified_at(self, db_session):
        """新規ユーザーが Google 経由で作成された場合、email_verified_at がセットされる."""
        user = await get_or_create_user_by_google_sub(
            db_session,
            google_sub="google_sub_new_001",
            email="new_user@example.com",
            name="New User",
            picture=None,
        )

        assert user.email == "new_user@example.com"
        assert user.google_sub == "google_sub_new_001"
        assert user.email_verified_at is not None

    # ============================================================
    # ケース2: 既存ユーザー（google_sub=None, email_verified_at=None）の自動紐付け拒否
    # ============================================================

    async def test_unverified_existing_user_is_rejected(self, db_session):
        """email_verified_at=None の既存ユーザーへの自動紐付けが拒否される."""
        # 未検証の既存ユーザーを作成
        existing_user = await create_user(
            db_session,
            user_id=_make_user_id(),
            email="unverified@example.com",
            name="Unverified User",
            google_sub=None,
            email_verified_at=None,
        )

        with pytest.raises(InvalidAuthorizationCodeError):
            await get_or_create_user_by_google_sub(
                db_session,
                google_sub="google_sub_attacker",
                email="unverified@example.com",
                name="Attacker",
                picture=None,
            )

        # 既存ユーザーの google_sub が変更されていないことを確認
        await db_session.refresh(existing_user)
        assert existing_user.google_sub is None

    # ============================================================
    # ケース3: 既存ユーザー（google_sub=None, email_verified_at=設定済み）の紐付け成功
    # ============================================================

    async def test_verified_existing_user_is_linked(self, db_session):
        """email_verified_at が設定済みの既存ユーザーへの自動紐付けが成功する."""
        verified_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        existing_user = await create_user(
            db_session,
            user_id=_make_user_id(),
            email="verified@example.com",
            name="Verified User",
            google_sub=None,
            email_verified_at=verified_at,
        )
        original_user_id = existing_user.id

        user = await get_or_create_user_by_google_sub(
            db_session,
            google_sub="google_sub_verified",
            email="verified@example.com",
            name="Verified User",
            picture=None,
        )

        # 同一ユーザーに紐付けされていることを確認
        assert user.id == original_user_id
        assert user.google_sub == "google_sub_verified"
        # email_verified_at が更新されていることを確認
        assert user.email_verified_at is not None

    # ============================================================
    # ケース4: 既存ユーザー（google_sub 設定済み）の再ログインで email_verified_at が変更されない
    # ============================================================

    async def test_existing_google_user_keeps_original_email_verified_at(self, db_session):
        """google_sub が設定済みのユーザーが再ログインしても email_verified_at は初回値を保持する."""
        old_verified_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        existing_user = await create_user(
            db_session,
            user_id=_make_user_id(),
            email="google_user@example.com",
            name="Google User",
            google_sub="google_sub_existing_001",
            email_verified_at=old_verified_at,
        )

        user = await get_or_create_user_by_google_sub(
            db_session,
            google_sub="google_sub_existing_001",
            email="google_user@example.com",
            name="Google User Updated",
            picture=None,
        )

        assert user.id == existing_user.id
        # 再ログインで email_verified_at が上書きされず、初回検証日時が保持される
        # SQLite はタイムゾーン情報を保持しないため naive datetime で比較
        assert user.email_verified_at is not None
        assert user.email_verified_at.replace(tzinfo=None) == old_verified_at.replace(tzinfo=None)

    # ============================================================
    # ケース5: 既存ユーザー（別の google_sub が設定済み）の場合は別エラー
    # ============================================================

    async def test_different_google_sub_raises_error(self, db_session):
        """別の google_sub が設定済みのユーザーには専用エラーが raise される."""
        existing_user = await create_user(
            db_session,
            user_id=_make_user_id(),
            email="another_google@example.com",
            name="Another Google User",
            google_sub="existing_google_sub",
            email_verified_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )

        with pytest.raises(InvalidAuthorizationCodeError) as exc_info:
            await get_or_create_user_by_google_sub(
                db_session,
                google_sub="different_google_sub",
                email="another_google@example.com",
                name="Another User",
                picture=None,
            )

        # InvalidAuthorizationCodeError が raise されることを確認（詳細はログにのみ記録）
        assert "Google アカウントの連携に失敗しました。" in exc_info.value.detail

        # 既存ユーザーの google_sub が変更されていないことを確認
        await db_session.refresh(existing_user)
        assert existing_user.google_sub == "existing_google_sub"

    # ============================================================
    # ケース6: スタブログイン経由で作成したユーザーは email_verified_at=None のまま
    # ============================================================

    async def test_stub_user_has_no_email_verified_at(self, db_session):
        """スタブログインで作成したユーザーは email_verified_at=None のまま."""
        user = await get_or_create_user_by_email(
            db_session,
            email="stub_user@example.com",
            name="Stub User",
        )

        assert user.email == "stub_user@example.com"
        assert user.email_verified_at is None

    async def test_stub_user_then_google_login_is_rejected(self, db_session):
        """スタブログインで作成したユーザーに対して Google ログインを試みると拒否される.

        スタブユーザーは email_verified_at=None のため、
        Google OAuth からの自動紐付けが拒否される（ケース2の延長）。
        """
        # スタブログインでユーザーを作成
        stub_user = await get_or_create_user_by_email(
            db_session,
            email="stub_then_google@example.com",
            name="Stub User",
        )
        assert stub_user.email_verified_at is None

        # Google ログインを試行すると拒否される
        with pytest.raises(InvalidAuthorizationCodeError):
            await get_or_create_user_by_google_sub(
                db_session,
                google_sub="google_sub_for_stub",
                email="stub_then_google@example.com",
                name="Stub User",
                picture=None,
            )

        # google_sub が変更されていないことを確認
        await db_session.refresh(stub_user)
        assert stub_user.google_sub is None
