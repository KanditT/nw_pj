import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class InspectionRule(Base):
    __tablename__ = "inspection_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    item_code: Mapped[str | None] = mapped_column(String(140))  # None = applies to all
    inspection_type: Mapped[str | None] = mapped_column(String(100))
    conditions: Mapped[dict] = mapped_column(JSON, default=dict)
    # e.g. {"parameter": "thickness", "operator": "between", "min": 1.0, "max": 2.0}
    severity: Mapped[str] = mapped_column(String(20), default="warning")  # warning | critical
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(140))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
