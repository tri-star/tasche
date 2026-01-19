"""Week モデル."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from tasche.db.base import Base


class Week(Base):
    """週テーブル."""

    __tablename__ = "weeks"
    __table_args__ = (
        UniqueConstraint("user_id", "start_date", name="uq_weeks_user_id_start_date"),
    )

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # ULID (wk_xxxx)
    user_id: Mapped[str] = mapped_column(
        String(30), ForeignKey("users.id"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    unit_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    week_start_day: Mapped[str] = mapped_column(String(10), nullable=False)
    week_start_hour: Mapped[int] = mapped_column(Integer, nullable=False)

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
