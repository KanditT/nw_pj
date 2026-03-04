from datetime import datetime
from pydantic import BaseModel


class RuleCreate(BaseModel):
    name: str
    description: str | None = None
    item_code: str | None = None
    inspection_type: str | None = None
    conditions: dict
    severity: str = "warning"
    created_by: str


class RuleRead(RuleCreate):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RuleUpdate(BaseModel):
    description: str | None = None
    conditions: dict | None = None
    severity: str | None = None
    is_active: bool | None = None
