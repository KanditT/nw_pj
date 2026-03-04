from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.checklist import Checklist, ChecklistItem
from app.schemas.checklist import ChecklistCreate, ChecklistRead

router = APIRouter()


@router.get("/", response_model=list[ChecklistRead])
async def list_checklists(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Checklist).options(selectinload(Checklist.items))
        .where(Checklist.is_active == True)
    )
    return result.scalars().all()


@router.post("/", response_model=ChecklistRead, status_code=201)
async def create_checklist(body: ChecklistCreate, db: AsyncSession = Depends(get_db)):
    checklist = Checklist(**body.model_dump(exclude={"items"}))
    db.add(checklist)
    await db.flush()
    for item_data in body.items:
        db.add(ChecklistItem(checklist_id=checklist.id, **item_data.model_dump()))
    await db.commit()
    result = await db.execute(
        select(Checklist).options(selectinload(Checklist.items))
        .where(Checklist.id == checklist.id)
    )
    return result.scalar_one()


@router.get("/{checklist_id}", response_model=ChecklistRead)
async def get_checklist(checklist_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Checklist).options(selectinload(Checklist.items))
        .where(Checklist.id == checklist_id)
    )
    checklist = result.scalar_one_or_none()
    if not checklist:
        raise HTTPException(404, "Checklist not found")
    return checklist


@router.delete("/{checklist_id}", status_code=204)
async def delete_checklist(checklist_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Checklist).where(Checklist.id == checklist_id))
    checklist = result.scalar_one_or_none()
    if not checklist:
        raise HTTPException(404, "Checklist not found")
    checklist.is_active = False
    await db.commit()
