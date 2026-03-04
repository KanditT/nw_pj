from datetime import datetime
from pydantic import BaseModel
from app.models.approval import ApprovalStatus


class ApprovalRequestCreate(BaseModel):
    inspection_id: str
    requested_by: str
    priority: str = "normal"
    notes: str | None = None
    deadline: datetime | None = None


class ApprovalDecisionCreate(BaseModel):
    decided_by: str
    decision: str  # "approved" | "rejected"
    comments: str | None = None


class ApprovalDecisionRead(ApprovalDecisionCreate):
    id: str
    request_id: str
    decided_at: datetime
    erpnext_synced: bool

    model_config = {"from_attributes": True}


class ApprovalRequestRead(BaseModel):
    id: str
    inspection_id: str
    requested_by: str
    requested_at: datetime
    status: ApprovalStatus
    priority: str
    notes: str | None
    deadline: datetime | None
    decisions: list[ApprovalDecisionRead] = []

    model_config = {"from_attributes": True}
