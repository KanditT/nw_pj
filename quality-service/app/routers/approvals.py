from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.models.inspection import QualityInspection
from app.schemas.approval import ApprovalRequestCreate, ApprovalRequestRead, ApprovalDecisionCreate
from app.services import approval_engine

router = APIRouter()

_load_approval = selectinload(ApprovalRequest.decisions)


async def _get_approval_or_404(db: AsyncSession, request_id: str) -> ApprovalRequest:
    result = await db.execute(
        select(ApprovalRequest).options(_load_approval)
        .where(ApprovalRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Approval request not found")
    return req


@router.get("/", response_model=list[ApprovalRequestRead])
async def list_approvals(
    status: ApprovalStatus | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(ApprovalRequest).options(_load_approval)
    if status:
        q = q.where(ApprovalRequest.status == status)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=ApprovalRequestRead, status_code=201)
async def request_approval(body: ApprovalRequestCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QualityInspection).where(QualityInspection.id == body.inspection_id)
    )
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(404, "Inspection not found")

    existing = await db.execute(
        select(ApprovalRequest).where(
            ApprovalRequest.inspection_id == body.inspection_id,
            ApprovalRequest.status == ApprovalStatus.pending,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "An open approval request already exists for this inspection")

    req = await approval_engine.submit_for_approval(
        db, inspection,
        requested_by=body.requested_by,
        priority=body.priority,
        notes=body.notes,
        deadline=body.deadline,
    )
    return await _get_approval_or_404(db, req.id)


@router.get("/{request_id}", response_model=ApprovalRequestRead)
async def get_approval(request_id: str, db: AsyncSession = Depends(get_db)):
    return await _get_approval_or_404(db, request_id)


@router.post("/{request_id}/approve", response_model=ApprovalRequestRead)
async def approve(
    request_id: str, body: ApprovalDecisionCreate, db: AsyncSession = Depends(get_db)
):
    req = await _get_approval_or_404(db, request_id)
    try:
        await approval_engine.decide(db, req, body.decided_by, "approved", body.comments)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return await _get_approval_or_404(db, request_id)


@router.post("/{request_id}/reject", response_model=ApprovalRequestRead)
async def reject(
    request_id: str, body: ApprovalDecisionCreate, db: AsyncSession = Depends(get_db)
):
    req = await _get_approval_or_404(db, request_id)
    try:
        await approval_engine.decide(db, req, body.decided_by, "rejected", body.comments)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return await _get_approval_or_404(db, request_id)
