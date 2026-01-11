"""v1 ルーター集約."""
from fastapi import APIRouter

from tasche.api.v1 import users

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["ユーザー"])

# 将来追加:
# api_router.include_router(tasks.router, prefix="/tasks", tags=["タスク"])
# api_router.include_router(weeks.router, prefix="/weeks", tags=["週"])
# ...
