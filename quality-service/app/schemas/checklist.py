from datetime import datetime
from pydantic import BaseModel


class ChecklistItemCreate(BaseModel):
    order: int = 0
    description: str
    is_mandatory: bool = True
    expected_value: str | None = None
    remarks: str | None = None


class ChecklistItemRead(ChecklistItemCreate):
    id: str
    checklist_id: str

    model_config = {"from_attributes": True}


class ChecklistCreate(BaseModel):
    name: str
    description: str | None = None
    category: str | None = None
    created_by: str
    items: list[ChecklistItemCreate] = []


class ChecklistRead(BaseModel):
    id: str
    name: str
    description: str | None
    category: str | None
    is_active: bool
    created_by: str
    created_at: datetime
    updated_at: datetime
    items: list[ChecklistItemRead] = []

    model_config = {"from_attributes": True}
