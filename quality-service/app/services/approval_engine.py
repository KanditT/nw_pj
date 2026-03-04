"""Approval workflow engine."""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.approval import ApprovalRequest, ApprovalDecision, ApprovalStatus
from app.models.inspection import QualityInspection, InspectionStatus
from app.services import audit_logger
from app.services import erpnext_client


async def submit_for_approval(
    db: AsyncSession,
    inspection: QualityInspection,
    requested_by: str,
    priority: str = "normal",
    notes: str | None = None,
    deadline: datetime | None = None,
) -> ApprovalRequest:
    request = ApprovalRequest(
        inspection_id=inspection.id,
        requested_by=requested_by,
        priority=priority,
        notes=notes,
        deadline=deadline,
    )
    db.add(request)
    inspection.status = InspectionStatus.in_review
    await db.commit()
    await db.refresh(request)

    await audit_logger.log(
        db, actor=requested_by, action="submit_for_approval",
        resource_type="ApprovalRequest", resource_id=request.id,
        new_value={"inspection_id": inspection.id, "priority": priority},
    )
    return request


async def decide(
    db: AsyncSession,
    request: ApprovalRequest,
    decided_by: str,
    decision: str,
    comments: str | None = None,
) -> ApprovalDecision:
    if request.status != ApprovalStatus.pending:
        raise ValueError(f"Request is already {request.status}")

    decision_record = ApprovalDecision(
        request_id=request.id,
        decided_by=decided_by,
        decision=decision,
        comments=comments,
    )
    db.add(decision_record)

    if decision == "approved":
        request.status = ApprovalStatus.approved
        result = await db.execute(
            select(QualityInspection).where(QualityInspection.id == request.inspection_id)
        )
        inspection = result.scalar_one_or_none()
        if inspection:
            inspection.status = InspectionStatus.approved
            # Sync to ERPNext if we have a name
            if inspection.erpnext_name:
                try:
                    await erpnext_client.trigger_workflow_action(
                        "Quality Inspection", inspection.erpnext_name, "Approve"
                    )
                    decision_record.erpnext_synced = True
                except Exception:
                    pass  # ERPNext sync failure — will retry via background job
    else:
        request.status = ApprovalStatus.rejected
        result = await db.execute(
            select(QualityInspection).where(QualityInspection.id == request.inspection_id)
        )
        inspection = result.scalar_one_or_none()
        if inspection:
            inspection.status = InspectionStatus.rejected

    await db.commit()
    await db.refresh(decision_record)

    await audit_logger.log(
        db, actor=decided_by, action=f"approval_{decision}",
        resource_type="ApprovalRequest", resource_id=request.id,
        new_value={"decision": decision, "comments": comments},
    )
    return decision_record
