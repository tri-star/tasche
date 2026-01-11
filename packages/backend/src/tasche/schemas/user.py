"""ユーザースキーマ."""
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    """ユーザーレスポンス."""

    id: str
    email: EmailStr
    name: str
    picture: str | None
    timezone: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
