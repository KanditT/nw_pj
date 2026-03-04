"""Immutable audit trail service. Every state-changing action must be logged."""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog


async def log(
    db: AsyncSession,
    actor: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: str | None = None,
    result: str = "success",
) -> AuditLog:
    entry = AuditLog(
        timestamp=datetime.utcnow(),
        actor=actor,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
        result=result,
    )
    db.add(entry)
    await db.commit()
    return entry
