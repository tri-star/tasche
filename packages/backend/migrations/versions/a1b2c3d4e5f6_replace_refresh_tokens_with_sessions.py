"""replace_refresh_tokens_with_sessions

Revision ID: a1b2c3d4e5f6
Revises: 5a498125e765
Create Date: 2026-06-20 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "5a498125e765"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # sessions テーブルを作成
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(length=30), nullable=False),
        sa.Column("user_id", sa.String(length=30), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sessions_token_hash"), "sessions", ["token_hash"], unique=True)
    op.create_index(op.f("ix_sessions_user_id"), "sessions", ["user_id"], unique=False)

    # refresh_tokens テーブルを削除（インデックスから先に drop）
    op.drop_index("ix_refresh_tokens_user_id_revoked_at", table_name="refresh_tokens")
    op.drop_index(op.f("ix_refresh_tokens_user_id"), table_name="refresh_tokens")
    op.drop_index(op.f("ix_refresh_tokens_token_hash"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")


def downgrade() -> None:
    # sessions テーブルを削除
    op.drop_index(op.f("ix_sessions_user_id"), table_name="sessions")
    op.drop_index(op.f("ix_sessions_token_hash"), table_name="sessions")
    op.drop_table("sessions")

    # refresh_tokens テーブルを再作成
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.String(length=30), nullable=False),
        sa.Column("user_id", sa.String(length=30), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rotated_from_id", sa.String(length=30), nullable=True),
        sa.Column("rotated_to_id", sa.String(length=30), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["rotated_from_id"],
            ["refresh_tokens.id"],
        ),
        sa.ForeignKeyConstraint(
            ["rotated_to_id"],
            ["refresh_tokens.id"],
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_refresh_tokens_token_hash"), "refresh_tokens", ["token_hash"], unique=True
    )
    op.create_index(op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False)
    op.create_index(
        "ix_refresh_tokens_user_id_revoked_at",
        "refresh_tokens",
        ["user_id", "revoked_at"],
        unique=False,
    )
