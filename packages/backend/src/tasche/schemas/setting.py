"""設定リソースのスキーマ."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Theme = Literal["light", "dark"]


class SettingsResponse(BaseModel):
    """ユーザー設定のレスポンス."""

    timezone: str
    theme: Theme

    model_config = ConfigDict(from_attributes=True)


class SettingsUpdateRequest(BaseModel):
    """ユーザー設定の部分更新リクエスト."""

    timezone: str | None = Field(default=None, min_length=1, max_length=50)
    theme: Theme | None = Field(default=None)
