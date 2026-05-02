"""merge_google_auth_and_goals_heads

Revision ID: 573f7187c750
Revises: 69930d35e349, e5f6a7b8c9d0
Create Date: 2026-05-02 16:27:14.449542

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "573f7187c750"
down_revision: Union[str, None] = ("69930d35e349", "e5f6a7b8c9d0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
