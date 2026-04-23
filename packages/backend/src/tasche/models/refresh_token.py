"""RefreshToken モデル."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from tasche.db.base import Base


class RefreshToken(Base):
    """リフレッシュトークンテーブル.

    不透明なリフレッシュトークンをDB管理する。
    生のトークンはCookieに保存し、DBにはSHA-256ハッシュのみを保存する。
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # ULID: rft_...
    user_id: Mapped[str] = mapped_column(
        String(30),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )  # sha256 hex
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rotated_from_id: Mapped[str | None] = mapped_column(
        String(30),
        ForeignKey("refresh_tokens.id"),
        nullable=True,
    )
    rotated_to_id: Mapped[str | None] = mapped_column(
        String(30),
        ForeignKey("refresh_tokens.id"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (Index("ix_refresh_tokens_user_id_revoked_at", "user_id", "revoked_at"),)
