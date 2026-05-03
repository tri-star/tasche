"""add_week_daily_available_units

Revision ID: a6b7c8d9e0f1
Revises: 1aa789ccd79a
Create Date: 2026-05-03 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a6b7c8d9e0f1"
down_revision: Union[str, Sequence[str], None] = "1aa789ccd79a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

AVAILABLE_UNIT_COLUMNS = (
    "available_units_monday",
    "available_units_tuesday",
    "available_units_wednesday",
    "available_units_thursday",
    "available_units_friday",
    "available_units_saturday",
    "available_units_sunday",
)


def upgrade() -> None:
    """Upgrade schema."""
    for column_name in AVAILABLE_UNIT_COLUMNS:
        op.add_column(
            "weeks",
            sa.Column(
                column_name,
                sa.Numeric(precision=6, scale=1, asdecimal=False),
                server_default=sa.text("0"),
                nullable=False,
            ),
        )

    op.create_check_constraint(
        "ck_weeks_available_units_non_negative",
        "weeks",
        "available_units_monday >= 0 "
        "AND available_units_tuesday >= 0 "
        "AND available_units_wednesday >= 0 "
        "AND available_units_thursday >= 0 "
        "AND available_units_friday >= 0 "
        "AND available_units_saturday >= 0 "
        "AND available_units_sunday >= 0",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_weeks_available_units_non_negative", "weeks", type_="check")
    for column_name in reversed(AVAILABLE_UNIT_COLUMNS):
        op.drop_column("weeks", column_name)
