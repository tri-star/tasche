"""実績 API エンドポイント."""

from fastapi import APIRouter

from tasche.api.deps import CurrentUser, DbSession
from tasche.models.enums import DayOfWeek
from tasche.schemas.common import APIResponse
from tasche.schemas.record import (
    RecordCreate,
    RecordResponse,
    RecordsResponse,
    RecordUpdate,
)
from tasche.services import record as record_service

router = APIRouter()


def _build_record_response(record, task_name: str) -> RecordResponse:
    return RecordResponse(
        id=record.id,
        week_id=record.week_id,
        task_id=record.task_id,
        task_name=task_name,
        day_of_week=record.day_of_week,
        actual_units=float(record.actual_units),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.get("", response_model=APIResponse[RecordsResponse])
async def get_current_records(
    db: DbSession,
    current_user: CurrentUser,
) -> APIResponse[RecordsResponse]:
    """今週の実績一覧を取得する."""
    records = await record_service.list_current_records(db, current_user)
    return APIResponse(data=records)


@router.put("/{day_of_week}/{task_id}", response_model=APIResponse[RecordResponse])
async def upsert_record(
    day_of_week: DayOfWeek,
    task_id: str,
    record_update: RecordUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> APIResponse[RecordResponse]:
    """今週の実績を作成または更新する."""
    record, task_name, _ = await record_service.upsert_current_record(
        db,
        current_user,
        task_id=task_id,
        day_of_week=day_of_week,
        actual_units=record_update.actual_units,
    )
    await db.commit()
    return APIResponse(data=_build_record_response(record, task_name))


@router.post("", response_model=APIResponse[RecordResponse], status_code=201)
async def create_record(
    record_create: RecordCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> APIResponse[RecordResponse]:
    """実績を記録する."""
    record, task_name, _ = await record_service.upsert_current_record(
        db,
        current_user,
        task_id=record_create.task_id,
        day_of_week=record_create.day_of_week,
        actual_units=record_create.actual_units,
    )
    await db.commit()
    return APIResponse(data=_build_record_response(record, task_name))
