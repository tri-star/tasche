"""テスト用認証ヘルパー（enable_test_auth==True の時のみ使用可能）."""

from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.config import settings
from tasche.core.env import is_production
from tasche.models.user import User
from tasche.services.session import create_session


class SessionAuthDisabledError(Exception):
    """テスト認証が無効な場合のエラー."""

    pass


async def create_test_session(db: AsyncSession, user: User) -> str:
    """テスト用セッションを作成し、生のセッショントークンを返す.

    Args:
        db: DBセッション
        user: テスト対象ユーザー

    Returns:
        raw_session_token: Cookie の session に設定する生トークン

    Raises:
        SessionAuthDisabledError: 本番環境の場合、または ENABLE_TEST_AUTH=false の場合
    """
    # 既存パターン(is_auth_stub_enabled が APP_ENV=production で強制Falseになるのと同様)に揃える
    if is_production(settings.app_env):
        raise SessionAuthDisabledError("create_test_session must not be called in production")
    if not settings.enable_test_auth:
        raise SessionAuthDisabledError("create_test_session requires ENABLE_TEST_AUTH=true")

    _session, raw_token = await create_session(db, user_id=user.id)
    await db.commit()
    return raw_token
