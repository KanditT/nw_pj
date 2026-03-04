import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    inspection_id: Mapped[str] = mapped_column(ForeignKey("quality_inspections.id"))
    requested_by: Mapped[str] = mapped_column(String(140))
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[ApprovalStatus] = mapped_column(
        SAEnum(ApprovalStatus), default=ApprovalStatus.pending
    )
    priority: Mapped[str] = mapped_column(String(20), default="normal")
    notes: Mapped[str | None] = mapped_column(Text)
    deadline: Mapped[datetime | None] = mapped_column(DateTime)

    inspection: Mapped["QualityInspection"] = relationship(back_populates="approval_requests")
    decisions: Mapped[list["ApprovalDecision"]] = relationship(
        back_populates="request", cascade="all, delete-orphan"
    )


class ApprovalDecision(Base):
    __tablename__ = "approval_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(ForeignKey("approval_requests.id", ondelete="CASCADE"))
    decided_by: Mapped[str] = mapped_column(String(140))
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    decision: Mapped[str] = mapped_column(String(20))  # approved | rejected
    comments: Mapped[str | None] = mapped_column(Text)
    erpnext_synced: Mapped[bool] = mapped_column(default=False)

    request: Mapped["ApprovalRequest"] = relationship(back_populates="decisions")
