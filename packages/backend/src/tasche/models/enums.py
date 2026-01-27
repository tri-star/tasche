"""モデル共通の Enum 定義."""

from enum import Enum


class DayOfWeek(str, Enum):
    """曜日の列挙型."""

    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"
