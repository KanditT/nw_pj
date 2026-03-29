from fastapi import HTTPException, APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import requests
import json

from config.config import FRAPPE_URL, HEADERS
from routes.audit_log import log_action

router = APIRouter()
domain = "Quality Inspection"

SUBMIT_HEADERS = {
    **HEADERS,
    "Content-Type": "application/json",
}


# ── Doctype: Quality Inspection ───────────────────────────────────────────────
# docstatus=1 (Submitted) is set automatically on create.
# Creating a QI also auto-creates an Approval Request (Pending).

class QIReadingIn(BaseModel):
    """Child table: Quality Inspection Reading"""
    specification: str          # references Quality Inspection Parameter name
    reading_1: str = ""         # must be string — ERPNext calls .strip() on it
    min_value: Optional[float] = None
    max_value: Optional[float] = None


class QIIn(BaseModel):
    naming_series: str = "MAT-QA-.YYYY.-"
    report_date: str                        # YYYY-MM-DD
    status: str = "Accepted"               # Accepted | Rejected | Cancelled
    inspection_type: str = "Incoming"      # Incoming | Outgoing | In Process
    reference_type: str = "Purchase Receipt"
    reference_name: str                    # Purchase Receipt name
    item_code: str
    sample_size: float = 0
    quality_inspection_template: Optional[str] = None
    inspected_by: str                      # user email
    readings: list[QIReadingIn] = []


class QIUpdate(BaseModel):
    report_date: Optional[str] = None
    status: Optional[str] = None
    inspection_type: Optional[str] = None
    reference_name: Optional[str] = None
    item_code: Optional[str] = None
    sample_size: Optional[float] = None
    quality_inspection_template: Optional[str] = None
    inspected_by: Optional[str] = None
    readings: Optional[list[QIReadingIn]] = None


@router.get("")
def get_quality_inspections(
    keyword: str = Query(None),
    page_size: int = Query(10),
    current_page: int = Query(1)
):
    try:
        base_url = f"{FRAPPE_URL}/api/resource/{domain}"
        start = (current_page - 1) * page_size

        params = {
            "fields": json.dumps(["name", "status", "docstatus", "report_date", "item_code", "inspected_by"]),
            "limit_page_length": page_size,
            "limit_start": start
        }

        filters = None
        if keyword:
            filters = [["name", "like", f"%{keyword}%"]]
            params["filters"] = json.dumps(filters)

        res = requests.get(base_url, headers=HEADERS, params=params)
        data = res.json().get("data", [])

        count_params = {}
        if keyword:
            count_params["filters"] = json.dumps(filters)

        count_res = requests.get(
            base_url,
            headers=HEADERS,
            params={**count_params, "limit_page_length": 0}
        )
        total = len(count_res.json().get("data", []))
        total_page = (total + page_size - 1) // page_size

        return {
            "data": data,
            "pagination": {
                "current_page": current_page,
                "page_size": page_size,
                "total_page": total_page,
                "total": total
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{name}")
def get_quality_inspection(name: str):
    try:
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def create_quality_inspection(data: QIIn):
    try:
        readings = [
            {"doctype": "Quality Inspection Reading", **r.model_dump()}
            for r in data.readings
        ]
        payload = {
            "doctype": domain,
            "docstatus": 1,
            **data.model_dump(exclude={"readings"}),
            "readings": readings,
        }

        res = requests.post(
            f"{FRAPPE_URL}/api/resource/{domain}",
            json=payload,
            headers=HEADERS
        )

        inspection = res.json().get("data", {})

        if not inspection:
            return res.json()

        inspection_name = inspection.get("name")
        
        approval_payload = {
            "doctype": "Approval Request",
            "reference_doctype": "Quality Inspection",
            "reference_name": inspection_name,
            "status": "Pending"
        }

        requests.post(
            f"{FRAPPE_URL}/api/resource/Approval Request",
            json=approval_payload,
            headers=HEADERS
        )

        log_action("create", "Quality Inspection", inspection_name,
                   user=data.inspected_by, detail=f"item={data.item_code}")

        return {
            "inspection": inspection,
            "message": "Inspection created + approval created"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{name}")
def update_quality_inspection(name: str, data: QIUpdate):
    try:
        body = data.model_dump(exclude_none=True)
        if "readings" in body:
            body["readings"] = [
                {"doctype": "Quality Inspection Reading", **r.model_dump()}
                for r in (data.readings or [])
            ]
        res = requests.put(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            json=body,
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{name}/cancel")
def cancel_quality_inspection(name: str):
    try:
        res = requests.put(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            json={"docstatus": 2},
            headers=HEADERS
        )
        log_action("cancel", "Quality Inspection", name)
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{name}")
def delete_quality_inspection(name: str):
    try:
        # Delete linked Approval Request first
        approval_res = requests.get(
            f"{FRAPPE_URL}/api/resource/Approval Request",
            headers=HEADERS,
            params={
                "filters": json.dumps([["reference_name", "=", name]]),
                "limit_page_length": 1,
            },
        )
        for approval in approval_res.json().get("data", []):
            requests.delete(
                f"{FRAPPE_URL}/api/resource/Approval Request/{approval['name']}",
                headers=HEADERS,
            )

        res = requests.delete(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        log_action("delete", "Quality Inspection", name)
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
