"""カスタム例外クラス、FastAPI 例外ハンドラー."""
from fastapi import HTTPException, status


class TascheException(Exception):
    """Tasche 基底例外."""

    pass


class UserNotFoundException(TascheException):
    """ユーザーが見つからない."""

    def __init__(self, user_id: str):
        """初期化."""
        self.user_id = user_id
        super().__init__(f"User not found: {user_id}")


class TaskNotFoundException(TascheException):
    """タスクが見つからない."""

    def __init__(self, task_id: str):
        """初期化."""
        self.task_id = task_id
        super().__init__(f"Task not found: {task_id}")
