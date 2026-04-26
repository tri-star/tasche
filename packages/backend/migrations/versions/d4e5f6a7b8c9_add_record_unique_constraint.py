"""add_record_unique_constraint

Revision ID: d4e5f6a7b8c9
Revises: c1a2b3c4d5e6
Create Date: 2026-04-27 01:35:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: str | Sequence[str] | None = "c1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint(
        "uq_records_week_task_day",
        "records",
        ["week_id", "task_id", "day_of_week"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_records_week_task_day", "records", type_="unique")
