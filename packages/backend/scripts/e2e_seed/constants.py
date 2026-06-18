"""E2E テスト用 seed データ定義."""

from tasche.models.enums import DayOfWeek

E2E_USER = {
    "id": "usr_e2e0000000000000000001",
    "email": "e2e-test@example.com",
    "name": "E2E Test User",
    "timezone": "Asia/Tokyo",
}

E2E_WEEK = {
    "id": "wk_e2e0000000000000000001",
    "unit_duration_minutes": 30,
    "week_start_day": "monday",
    "week_start_hour": 4,
    "available_units_monday": 5.0,
    "available_units_tuesday": 4.0,
    "available_units_wednesday": 3.0,
    "available_units_thursday": 3.0,
    "available_units_friday": 3.0,
    "available_units_saturday": 4.0,
    "available_units_sunday": 4.0,
}

E2E_TASKS = [
    {
        "id": "tsk_e2e000000000000000001",
        "name": "試験勉強",
        "is_archived": False,
    },
    {
        "id": "tsk_e2e000000000000000002",
        "name": "個人開発",
        "is_archived": False,
    },
    {
        "id": "tsk_e2e000000000000000003",
        "name": "後で読む消化",
        "is_archived": False,
    },
]

E2E_GOALS = [
    {
        "task_id": "tsk_e2e000000000000000001",
        "daily_targets": {
            DayOfWeek.MONDAY: 2.0,
            DayOfWeek.TUESDAY: 1.0,
            DayOfWeek.WEDNESDAY: 2.0,
            DayOfWeek.THURSDAY: 1.0,
            DayOfWeek.FRIDAY: 2.0,
            DayOfWeek.SATURDAY: 0.0,
            DayOfWeek.SUNDAY: 0.0,
        },
    },
    {
        "task_id": "tsk_e2e000000000000000002",
        "daily_targets": {
            DayOfWeek.MONDAY: 2.0,
            DayOfWeek.TUESDAY: 2.0,
            DayOfWeek.WEDNESDAY: 1.0,
            DayOfWeek.THURSDAY: 2.0,
            DayOfWeek.FRIDAY: 0.0,
            DayOfWeek.SATURDAY: 4.0,
            DayOfWeek.SUNDAY: 4.0,
        },
    },
    {
        "task_id": "tsk_e2e000000000000000003",
        "daily_targets": {
            DayOfWeek.MONDAY: 1.0,
            DayOfWeek.TUESDAY: 1.0,
            DayOfWeek.WEDNESDAY: 1.0,
            DayOfWeek.THURSDAY: 1.0,
            DayOfWeek.FRIDAY: 1.0,
            DayOfWeek.SATURDAY: 0.0,
            DayOfWeek.SUNDAY: 0.0,
        },
    },
]

E2E_RECORDS = [
    {
        "task_id": "tsk_e2e000000000000000001",
        "daily_actuals": {
            DayOfWeek.MONDAY: 2.5,
            DayOfWeek.TUESDAY: 1.0,
            DayOfWeek.WEDNESDAY: 1.5,
        },
    },
    {
        "task_id": "tsk_e2e000000000000000002",
        "daily_actuals": {
            DayOfWeek.MONDAY: 2.0,
            DayOfWeek.TUESDAY: 1.5,
            DayOfWeek.WEDNESDAY: 0.5,
        },
    },
    {
        "task_id": "tsk_e2e000000000000000003",
        "daily_actuals": {
            DayOfWeek.MONDAY: 1.0,
            DayOfWeek.TUESDAY: 0.0,
            DayOfWeek.WEDNESDAY: 0.5,
        },
    },
]
