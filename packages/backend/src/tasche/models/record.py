"""Record モデル."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from tasche.db.base import Base


class Record(Base):
    """実績テーブル."""

    __tablename__ = "records"
    __table_args__ = (
        CheckConstraint("actual_units >= 0", name="ck_records_actual_units_non_negative"),
    )

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # ULID (rec_xxxx)
    week_id: Mapped[str] = mapped_column(
        String(30), ForeignKey("weeks.id"), nullable=False, index=True
    )
    task_id: Mapped[str] = mapped_column(
        String(30), ForeignKey("tasks.id"), nullable=False, index=True
    )
    day_of_week: Mapped[str] = mapped_column(
        Enum(
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
            name="day_of_week_enum",
        ),
        nullable=False,
    )
    actual_units: Mapped[float] = mapped_column(Numeric(6, 1, asdecimal=False), nullable=False)

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
