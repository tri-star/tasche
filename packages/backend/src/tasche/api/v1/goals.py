"""目標 API エンドポイント."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.api.deps import CurrentUser, DbSession
from tasche.schemas.common import APIResponse
from tasche.schemas.goal import (
    GoalsResponse,
    GoalsUpdate,
    GoalsUpdateResponse,
)
from tasche.services import goal as goal_service

router = APIRouter()


@asynccontextmanager
async def _transaction(db: AsyncSession) -> AsyncIterator[None]:
    """API 層でトランザクション境界を管理する."""
    if not db.in_transaction():
        async with db.begin():
            yield
        return

    try:
        yield
    except Exception:
        await db.rollback()
        raise
    else:
        try:
            await db.commit()
        except Exception:
            await db.rollback()
            raise


@router.get("", response_model=APIResponse[GoalsResponse])
async def get_current_goals(
    db: DbSession,
    current_user: CurrentUser,
) -> APIResponse[GoalsResponse]:
    """今週の目標一覧を取得する."""
    goals = await goal_service.list_current_goals(db, current_user)
    return APIResponse(data=goals)


@router.put("", response_model=APIResponse[GoalsUpdateResponse])
async def update_current_goals(
    goals_update: GoalsUpdate, db: DbSession, current_user: CurrentUser
) -> APIResponse[GoalsUpdateResponse]:
    """今週の目標を一括更新する."""
    async with _transaction(db):
        update_response = await goal_service.replace_current_goals(db, current_user, goals_update)
    return APIResponse(data=update_response)
