from datetime import datetime
from pydantic import BaseModel
from app.models.inspection import InspectionStatus


class InspectionItemCreate(BaseModel):
    parameter: str
    specification: str | None = None
    min_value: float | None = None
    max_value: float | None = None
    actual_value: float | None = None
    reading_1: float | None = None
    reading_2: float | None = None
    reading_3: float | None = None
    remarks: str | None = None


class InspectionItemRead(InspectionItemCreate):
    id: str
    status: str | None = None

    model_config = {"from_attributes": True}


class InspectionCreate(BaseModel):
    inspection_type: str
    item_code: str
    item_name: str | None = None
    reference_type: str | None = None
    reference_name: str | None = None
    batch_no: str | None = None
    sample_size: float | None = None
    remarks: str | None = None
    created_by: str
    items: list[InspectionItemCreate] = []


class InspectionRead(BaseModel):
    id: str
    erpnext_name: str | None
    inspection_type: str
    item_code: str
    item_name: str | None
    reference_type: str | None
    reference_name: str | None
    batch_no: str | None
    sample_size: float | None
    status: InspectionStatus
    remarks: str | None
    inspected_by: str | None
    inspected_at: datetime | None
    created_by: str
    created_at: datetime
    updated_at: datetime
    items: list[InspectionItemRead] = []

    model_config = {"from_attributes": True}


class InspectionUpdate(BaseModel):
    status: InspectionStatus | None = None
    remarks: str | None = None
    inspected_by: str | None = None
    inspected_at: datetime | None = None
    items: list[InspectionItemCreate] | None = None


class ValidationResult(BaseModel):
    passed: bool
    violations: list[dict]
    warnings: list[dict]
