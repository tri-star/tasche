"""共通スキーマ."""
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """API レスポンス共通フォーマット."""

    data: T


class ErrorResponse(BaseModel):
    """エラーレスポンス."""

    code: str
    message: str
