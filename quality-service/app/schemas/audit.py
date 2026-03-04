from datetime import datetime
from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    action: str
    resource_type: str
    resource_id: str | None
    old_value: dict | None
    new_value: dict | None
    ip_address: str | None
    user_agent: str | None
    details: str | None
    result: str

    model_config = {"from_attributes": True}


class AuditLogFilter(BaseModel):
    actor: str | None = None
    action: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    result: str | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None
