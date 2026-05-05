"""Week モデル."""

from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from tasche.db.base import Base


class Week(Base):
    """週テーブル."""

    __tablename__ = "weeks"
    __table_args__ = (
        CheckConstraint(
            "available_units_monday >= 0 "
            "AND available_units_tuesday >= 0 "
            "AND available_units_wednesday >= 0 "
            "AND available_units_thursday >= 0 "
            "AND available_units_friday >= 0 "
            "AND available_units_saturday >= 0 "
            "AND available_units_sunday >= 0",
            name="ck_weeks_available_units_non_negative",
        ),
        UniqueConstraint("user_id", "start_date", name="uq_weeks_user_id_start_date"),
    )

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # ULID (wk_xxxx)
    user_id: Mapped[str] = mapped_column(
        String(30), ForeignKey("users.id"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    unit_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    available_units_monday: Mapped[float] = mapped_column(
        Numeric(6, 1, asdecimal=False), nullable=False, default=0.0, server_default=text("0")
    )
    available_units_tuesday: Mapped[float] = mapped_column(
        Numeric(6, 1, asdecimal=False), nullable=False, default=0.0, server_default=text("0")
    )
    available_units_wednesday: Mapped[float] = mapped_column(
        Numeric(6, 1, asdecimal=False), nullable=False, default=0.0, server_default=text("0")
    )
    available_units_thursday: Mapped[float] = mapped_column(
        Numeric(6, 1, asdecimal=False), nullable=False, default=0.0, server_default=text("0")
    )
    available_units_friday: Mapped[float] = mapped_column(
        Numeric(6, 1, asdecimal=False), nullable=False, default=0.0, server_default=text("0")
    )
    available_units_saturday: Mapped[float] = mapped_column(
        Numeric(6, 1, asdecimal=False), nullable=False, default=0.0, server_default=text("0")
    )
    available_units_sunday: Mapped[float] = mapped_column(
        Numeric(6, 1, asdecimal=False), nullable=False, default=0.0, server_default=text("0")
    )
    week_start_day: Mapped[str] = mapped_column(
        Enum("monday", "sunday", name="week_start_day_enum"), nullable=False
    )
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
