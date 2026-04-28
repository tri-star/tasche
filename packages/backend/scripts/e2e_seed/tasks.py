"""E2E テスト用 task seed."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tasche.models.task import Task
from tasche.models.user import User

from .constants import E2E_TASKS


async def seed_tasks(session: AsyncSession, user: User) -> list[Task]:
    """E2E 用タスクを作成または更新する."""
    tasks: list[Task] = []

    for task_data in E2E_TASKS:
        result = await session.execute(select(Task).where(Task.id == task_data["id"]))
        task = result.scalar_one_or_none()

        if task is None:
            task = Task(user_id=user.id, **task_data)
            session.add(task)
            await session.flush()
            print(f"✓ Created E2E task: {task.name}")
        else:
            task.user_id = user.id
            task.name = task_data["name"]
            task.is_archived = task_data["is_archived"]
            print(f"✓ Updated E2E task: {task.name}")

        tasks.append(task)

    return tasks
