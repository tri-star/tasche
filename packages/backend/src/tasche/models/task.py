"""Task モデル."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from tasche.db.base import Base


class Task(Base):
    """タスクテーブル."""

    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # ULID (tsk_xxxx)
    user_id: Mapped[str] = mapped_column(
        String(30), ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
