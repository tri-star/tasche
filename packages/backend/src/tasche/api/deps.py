"""共通依存関係."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.core.security import get_current_user_sub
from tasche.db.session import get_db
from tasche.models.user import User
from tasche.services.user import get_user_by_id

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
