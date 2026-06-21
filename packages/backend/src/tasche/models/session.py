"""Session モデル."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from tasche.db.base import Base


class Session(Base):
    """セッションテーブル.

    不透明なセッショントークンをDB管理する。
    生のトークンはCookieに保存し、DBにはSHA-256ハッシュのみを保存する。
    """

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)  # ULID: ses_...
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

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
