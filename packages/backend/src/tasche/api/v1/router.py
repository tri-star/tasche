"""v1 ルーター集約."""

from fastapi import APIRouter, Depends

from tasche.api.deps import require_secrets_resolved
from tasche.api.v1 import auth, dashboard, goals, records, tasks, users, weeks

api_router = APIRouter(dependencies=[Depends(require_secrets_resolved)])

api_router.include_router(auth.router, prefix="/auth", tags=["認証"])
api_router.include_router(users.router, prefix="/users", tags=["ユーザー"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["タスク"])
api_router.include_router(weeks.router, prefix="/weeks", tags=["週"])
api_router.include_router(goals.router, prefix="/weeks/current/goals", tags=["目標"])
api_router.include_router(records.router, prefix="/weeks/current/records", tags=["実績"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["ダッシュボード"])
