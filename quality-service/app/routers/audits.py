from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.database import get_db
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogRead

router = APIRouter()


@router.get("/", response_model=list[AuditLogRead])
async def list_audit_logs(
    actor: str | None = Query(None),
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    resource_id: str | None = Query(None),
    result: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if actor:
        q = q.where(AuditLog.actor == actor)
    if action:
        q = q.where(AuditLog.action == action)
    if resource_type:
        q = q.where(AuditLog.resource_type == resource_type)
    if resource_id:
        q = q.where(AuditLog.resource_id == resource_id)
    if result:
        q = q.where(AuditLog.result == result)
    if from_date:
        q = q.where(AuditLog.timestamp >= from_date)
    if to_date:
        q = q.where(AuditLog.timestamp <= to_date)
    q = q.offset(offset).limit(limit)
    rows = await db.execute(q)
    return rows.scalars().all()


@router.get("/{log_id}", response_model=AuditLogRead)
async def get_audit_log(log_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(404, "Audit log not found")
    return log
