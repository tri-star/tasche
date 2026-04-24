"""User モデル."""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from tasche.db.base import Base


class User(Base):
    """ユーザーテーブル."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # ULID: usr_...
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    picture: Mapped[str | None] = mapped_column(String(512), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Asia/Tokyo")
    google_sub: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,  # SQLAlchemy が ix_users_google_sub を自動生成
    )

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
