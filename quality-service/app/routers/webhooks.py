"""Receive webhooks from ERPNext and keep local state in sync.

Configure in ERPNext:
  Integrations > Webhooks > New
  DocType: Quality Inspection
  Events: on_submit, on_update
  URL: http://quality-service:8000/api/v1/webhooks/erpnext
  Headers: X-Webhook-Secret: <WEBHOOK_SECRET>
"""
import hashlib, hmac
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.inspection import QualityInspection, InspectionStatus
from app.services import audit_logger
from app.config import settings

router = APIRouter()


def _verify_secret(secret: str | None):
    if not settings.webhook_secret:
        return  # no secret configured, skip verification
    if secret != settings.webhook_secret:
        raise HTTPException(401, "Invalid webhook secret")


@router.post("/erpnext")
async def erpnext_webhook(
    request: Request,
    x_webhook_secret: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
):
    _verify_secret(x_webhook_secret)
    payload = await request.json()

    doctype = payload.get("doctype", "")
    docname = payload.get("name", "")
    event = payload.get("event", "")

    if doctype == "Quality Inspection":
        # Find matching local record
        result = await db.execute(
            select(QualityInspection).where(QualityInspection.erpnext_name == docname)
        )
        inspection = result.scalar_one_or_none()

        erpnext_status = payload.get("status", "")
        status_map = {
            "Submitted": InspectionStatus.approved,
            "Rejected": InspectionStatus.rejected,
            "Draft": InspectionStatus.draft,
        }
        new_status = status_map.get(erpnext_status)

        if inspection and new_status:
            inspection.status = new_status
            await db.commit()

        await audit_logger.log(
            db,
            actor="erpnext",
            action=f"webhook_{event}",
            resource_type="QualityInspection",
            resource_id=docname,
            new_value={"erpnext_status": erpnext_status},
        )

    return {"received": True, "doctype": doctype, "name": docname}
