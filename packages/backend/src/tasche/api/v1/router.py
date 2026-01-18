"""v1 ルーター集約."""

from fastapi import APIRouter

from tasche.api.v1 import auth, dashboard, goals, records, tasks, test_auth, users, weeks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["認証"])
api_router.include_router(users.router, prefix="/users", tags=["ユーザー"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["タスク"])
api_router.include_router(weeks.router, prefix="/weeks", tags=["週"])
api_router.include_router(goals.router, prefix="/weeks/current/goals", tags=["目標"])
api_router.include_router(records.router, prefix="/weeks/current/records", tags=["実績"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["ダッシュボード"])
api_router.include_router(test_auth.router, prefix="/test-auth", tags=["テスト認証"])
