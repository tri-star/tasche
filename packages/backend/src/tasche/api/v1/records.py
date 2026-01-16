"""実績 API エンドポイント."""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter

from tasche.api.deps import CurrentUser
from tasche.schemas.common import APIResponse
from tasche.schemas.record import (
    DailyActuals,
    RecordItem,
    RecordResponse,
    RecordsResponse,
    RecordUpdate,
)

router = APIRouter()


@router.get("", response_model=APIResponse[RecordsResponse])
async def get_current_records(
    current_user: CurrentUser,
) -> APIResponse[RecordsResponse]:
    """今週の実績一覧を取得する."""
    # ダミーデータを返す
    records = RecordsResponse(
        week_id="wk_01HXYZ1234567890ABCDEF",
        unit_duration_minutes=30,
        records=[
            RecordItem(
                task_id="tsk_01HXYZ1234567890ABCDEF",
                task_name="英語学習",
                daily_actuals=DailyActuals(
                    monday=2.5,
                    tuesday=1.0,
                    wednesday=0,
                    thursday=0,
                    friday=0,
                    saturday=0,
                    sunday=0,
                ),
            ),
            RecordItem(
                task_id="tsk_02HXYZ1234567890ABCDEF",
                task_name="個人開発",
                daily_actuals=DailyActuals(
                    monday=2.0,
                    tuesday=1.5,
                    wednesday=0,
                    thursday=0,
                    friday=0,
                    saturday=0,
                    sunday=0,
                ),
            ),
        ],
    )
    return APIResponse(data=records)


@router.put("/{day}/{task_id}", response_model=APIResponse[RecordResponse])
async def update_record(
    day: Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    task_id: str,
    record_update: RecordUpdate,
    current_user: CurrentUser,
) -> APIResponse[RecordResponse]:
    """特定の曜日・タスクの実績を記録・更新する."""
    # ダミーデータを返す
    record = RecordResponse(
        id="rec_01HXYZ1234567890ABCDEF",
        week_id="wk_01HXYZ1234567890ABCDEF",
        task_id=task_id,
        task_name=f"Task {task_id}",
        day_of_week=day,
        actual_units=record_update.actual_units,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    return APIResponse(data=record)
