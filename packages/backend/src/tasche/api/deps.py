"""共通依存関係."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.config import settings
from tasche.core.security import get_current_user_sub
from tasche.db.session import get_db
from tasche.models.user import User
from tasche.services.user import get_user_by_id


def require_secrets_resolved() -> None:
    """API リクエスト処理前に Secret が解決済みであることを保証する.

    Lambda + Parameters and Secrets Lambda Extension 構成では、
    Extension の Lambda Runtime API 登録完了前に Secret 取得を行うと失敗する。
    lifespan で同期実行するとイベントループをブロックして /health が応答せず
    LWA の readiness check がタイムアウトするため、API ルーターの dependency に
    して初回リクエスト時に解決する。FastAPI は ``def`` で定義された同期 dependency を
    スレッドプール上で実行するため、リトライ中もイベントループはブロックされない。
    idempotent。
    """
    settings.ensure_secrets_resolved()


# 型エイリアス
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserSub = Annotated[str, Depends(get_current_user_sub)]


async def get_current_user(
    sub: CurrentUserSub,
    db: DbSession,
) -> User:
    """現在のユーザーを取得."""
    user = await get_user_by_id(db, sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
