import uuid
from datetime import datetime
from sqlalchemy import String, Float, Text, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class InspectionStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    in_review = "in_review"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class QualityInspection(Base):
    __tablename__ = "quality_inspections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    erpnext_name: Mapped[str | None] = mapped_column(String(140), unique=True)
    inspection_type: Mapped[str] = mapped_column(String(100))
    reference_type: Mapped[str | None] = mapped_column(String(100))
    reference_name: Mapped[str | None] = mapped_column(String(140))
    item_code: Mapped[str] = mapped_column(String(140))
    item_name: Mapped[str | None] = mapped_column(String(200))
    batch_no: Mapped[str | None] = mapped_column(String(140))
    sample_size: Mapped[float | None] = mapped_column(Float)
    status: Mapped[InspectionStatus] = mapped_column(
        SAEnum(InspectionStatus), default=InspectionStatus.draft
    )
    remarks: Mapped[str | None] = mapped_column(Text)
    inspected_by: Mapped[str | None] = mapped_column(String(140))
    inspected_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_by: Mapped[str] = mapped_column(String(140))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    items: Mapped[list["InspectionItem"]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )
    approval_requests: Mapped[list["ApprovalRequest"]] = relationship(
        back_populates="inspection"
    )


class InspectionItem(Base):
    __tablename__ = "inspection_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    inspection_id: Mapped[str] = mapped_column(ForeignKey("quality_inspections.id", ondelete="CASCADE"))
    parameter: Mapped[str] = mapped_column(String(200))
    specification: Mapped[str | None] = mapped_column(String(200))
    min_value: Mapped[float | None] = mapped_column(Float)
    max_value: Mapped[float | None] = mapped_column(Float)
    actual_value: Mapped[float | None] = mapped_column(Float)
    reading_1: Mapped[float | None] = mapped_column(Float)
    reading_2: Mapped[float | None] = mapped_column(Float)
    reading_3: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str | None] = mapped_column(String(50))
    remarks: Mapped[str | None] = mapped_column(Text)

    inspection: Mapped["QualityInspection"] = relationship(back_populates="items")
