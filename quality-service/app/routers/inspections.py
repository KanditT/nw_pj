from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.inspection import QualityInspection, InspectionItem, InspectionStatus
from app.models.rule import InspectionRule
from app.schemas.inspection import (
    InspectionCreate, InspectionRead, InspectionUpdate, ValidationResult
)
from app.services import audit_logger, erpnext_client
from app.services.rule_engine import validate_inspection

router = APIRouter()


@router.get("/", response_model=list[InspectionRead])
async def list_inspections(
    status: InspectionStatus | None = Query(None),
    item_code: str | None = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(QualityInspection).options(selectinload(QualityInspection.items))
    if status:
        q = q.where(QualityInspection.status == status)
    if item_code:
        q = q.where(QualityInspection.item_code == item_code)
    q = q.limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=InspectionRead, status_code=201)
async def create_inspection(body: InspectionCreate, db: AsyncSession = Depends(get_db)):
    inspection = QualityInspection(**body.model_dump(exclude={"items"}))
    db.add(inspection)
    await db.flush()

    for item_data in body.items:
        item = InspectionItem(inspection_id=inspection.id, **item_data.model_dump())
        db.add(item)

    await db.commit()
    result2 = await db.execute(
        select(QualityInspection).options(selectinload(QualityInspection.items))
        .where(QualityInspection.id == inspection.id)
    )
    inspection = result2.scalar_one()

    await audit_logger.log(
        db, actor=body.created_by, action="create_inspection",
        resource_type="QualityInspection", resource_id=inspection.id,
        new_value={"item_code": body.item_code, "type": body.inspection_type},
    )
    return inspection


@router.get("/{inspection_id}", response_model=InspectionRead)
async def get_inspection(inspection_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QualityInspection).options(selectinload(QualityInspection.items))
        .where(QualityInspection.id == inspection_id)
    )
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(404, "Inspection not found")
    return inspection


@router.put("/{inspection_id}", response_model=InspectionRead)
async def update_inspection(
    inspection_id: str, body: InspectionUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(QualityInspection).options(selectinload(QualityInspection.items))
        .where(QualityInspection.id == inspection_id)
    )
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(404, "Inspection not found")

    old_status = inspection.status
    update_data = body.model_dump(exclude_none=True, exclude={"items"})
    for k, v in update_data.items():
        setattr(inspection, k, v)

    if body.items is not None:
        # Replace items
        result2 = await db.execute(
            select(InspectionItem).where(InspectionItem.inspection_id == inspection_id)
        )
        for old_item in result2.scalars().all():
            await db.delete(old_item)
        for item_data in body.items:
            db.add(InspectionItem(inspection_id=inspection_id, **item_data.model_dump()))

    await db.commit()
    result3 = await db.execute(
        select(QualityInspection).options(selectinload(QualityInspection.items))
        .where(QualityInspection.id == inspection_id)
    )
    inspection = result3.scalar_one()

    await audit_logger.log(
        db, actor="system", action="update_inspection",
        resource_type="QualityInspection", resource_id=inspection_id,
        old_value={"status": old_status}, new_value=update_data,
    )
    return inspection


@router.post("/{inspection_id}/validate", response_model=ValidationResult)
async def validate(inspection_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QualityInspection).options(selectinload(QualityInspection.items))
        .where(QualityInspection.id == inspection_id)
    )
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(404, "Inspection not found")

    rules_result = await db.execute(select(InspectionRule).where(InspectionRule.is_active == True))
    rules = rules_result.scalars().all()

    return await validate_inspection(inspection, rules)


@router.post("/{inspection_id}/sync-erpnext", response_model=InspectionRead)
async def sync_to_erpnext(
    inspection_id: str, actor: str = Query("system"), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(QualityInspection).options(selectinload(QualityInspection.items))
        .where(QualityInspection.id == inspection_id)
    )
    inspection = result.scalar_one_or_none()
    if not inspection:
        raise HTTPException(404, "Inspection not found")

    payload = {
        "doctype": "Quality Inspection",
        "inspection_type": inspection.inspection_type,
        "item_code": inspection.item_code,
        "sample_size": inspection.sample_size,
        "status": "Submitted" if inspection.status == InspectionStatus.approved else "Draft",
    }
    try:
        if inspection.erpnext_name:
            await erpnext_client.update_quality_inspection(inspection.erpnext_name, payload)
        else:
            data = await erpnext_client.create_quality_inspection(payload)
            inspection.erpnext_name = data.get("name")
            await db.commit()
    except Exception as e:
        raise HTTPException(502, f"ERPNext sync failed: {e}")

    await audit_logger.log(
        db, actor=actor, action="sync_to_erpnext",
        resource_type="QualityInspection", resource_id=inspection_id,
    )
    result2 = await db.execute(
        select(QualityInspection).options(selectinload(QualityInspection.items))
        .where(QualityInspection.id == inspection_id)
    )
    return result2.scalar_one()
