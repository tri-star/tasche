"""v1 ルーター集約."""
from fastapi import APIRouter

from tasche.api.v1 import dashboard, goals, records, tasks, users, weeks

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["ユーザー"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["タスク"])
api_router.include_router(weeks.router, prefix="/weeks", tags=["週"])
api_router.include_router(goals.router, prefix="/weeks/current/goals", tags=["目標"])
api_router.include_router(
    records.router, prefix="/weeks/current/records", tags=["実績"]
)
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["ダッシュボード"])
