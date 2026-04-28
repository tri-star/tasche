"""add_goals_table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-28 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: str | Sequence[str] | None = "d4e5f6a7b8c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "goals",
        sa.Column("id", sa.String(length=30), nullable=False),
        sa.Column("week_id", sa.String(length=30), nullable=False),
        sa.Column("task_id", sa.String(length=30), nullable=False),
        sa.Column(
            "day_of_week",
            postgresql.ENUM(
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
                name="day_of_week_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "target_units", sa.Numeric(precision=6, scale=1, asdecimal=False), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            onupdate=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("target_units >= 0", name="ck_goals_target_units_non_negative"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["week_id"], ["weeks.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("week_id", "task_id", "day_of_week", name="uq_goals_week_task_day"),
    )
    op.create_index(op.f("ix_goals_task_id"), "goals", ["task_id"], unique=False)
    op.create_index(op.f("ix_goals_week_id"), "goals", ["week_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_goals_week_id"), table_name="goals")
    op.drop_index(op.f("ix_goals_task_id"), table_name="goals")
    op.drop_table("goals")
