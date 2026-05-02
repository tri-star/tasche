"""merge_google_auth_and_goals_heads

Revision ID: 8f4c2b1a9d7e
Revises: 69930d35e349, e5f6a7b8c9d0
Create Date: 2026-05-03 01:45:00.000000

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "8f4c2b1a9d7e"
down_revision: Union[str, Sequence[str], None] = ("69930d35e349", "e5f6a7b8c9d0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
