from fastapi import HTTPException, APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import requests
import json

from config.config import FRAPPE_URL, HEADERS

router = APIRouter()


# ── Doctype: Approval Request (custom doctype) ────────────────────────────────
# Created automatically when a Quality Inspection is submitted.
# status transitions: Pending → Approved | Rejected → (cancel) → Pending

class ApprovalRequestDoc(BaseModel):
    """Read-only shape returned by GET endpoints."""
    name: str                           # auto-generated ID
    reference_name: str                 # Quality Inspection name
    status: str                         # Pending | Approved | Rejected
    approved_by: Optional[str] = None   # user email of approver
    approved_at: Optional[str] = None   # ISO datetime string
    comment: Optional[str] = None


FIELDS = ["name", "reference_name", "status", "approved_by", "approved_at", "comment"]
BASE_URL = f"{FRAPPE_URL}/api/resource/Approval Request"


@router.get("/stats")
def get_stats():
    """Approval + QI counts for the dashboard."""
    try:
        def count_approval(status_filter):
            res = requests.get(
                BASE_URL, headers=HEADERS,
                params={"filters": json.dumps(status_filter), "limit_page_length": 0},
            )
            return len(res.json().get("data", []))

        def count_doctype(doctype):
            res = requests.get(
                f"{FRAPPE_URL}/api/resource/{doctype}",
                headers=HEADERS,
                params={"limit_page_length": 0},
            )
            return len(res.json().get("data", []))

        return {
            "approval": {
                "pending":  count_approval([["status", "=", "Pending"]]),
                "approved": count_approval([["status", "=", "Approved"]]),
                "rejected": count_approval([["status", "=", "Rejected"]]),
            },
            "totals": {
                "quality_inspection": count_doctype("Quality Inspection"),
                "purchase_receipt":   count_doctype("Purchase Receipt"),
                "item":               count_doctype("Item"),
                "supplier":           count_doctype("Supplier"),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _paginated(status_filter: list, keyword: str | None, page_size: int, current_page: int):
    start = (current_page - 1) * page_size
    params: dict = {
        "fields": json.dumps(FIELDS),
        "limit_page_length": page_size,
        "limit_start": start,
        "filters": json.dumps(status_filter),
    }
    count_params: dict = {"filters": json.dumps(status_filter)}

    if keyword:
        or_filters = json.dumps([
            ["name", "like", f"%{keyword}%"],
            ["reference_name", "like", f"%{keyword}%"],
        ])
        params["or_filters"] = or_filters
        count_params["or_filters"] = or_filters

    data = requests.get(BASE_URL, headers=HEADERS, params=params).json().get("data", [])
    total = len(requests.get(BASE_URL, headers=HEADERS, params={**count_params, "limit_page_length": 0}).json().get("data", []))
    total_page = max((total + page_size - 1) // page_size, 1)

    # Enrich each row with QI status (single batch request)
    qi_names = [r["reference_name"] for r in data if r.get("reference_name")]
    if qi_names:
        qi_res = requests.get(
            f"{FRAPPE_URL}/api/resource/Quality Inspection",
            headers=HEADERS,
            params={
                "fields": json.dumps(["name", "status"]),
                "filters": json.dumps([["name", "in", qi_names]]),
                "limit_page_length": len(qi_names),
            },
        )
        qi_status_map = {q["name"]: q["status"] for q in qi_res.json().get("data", [])}
        for r in data:
            r["qi_status"] = qi_status_map.get(r.get("reference_name"), "")

    return {
        "data": data,
        "pagination": {
            "current_page": current_page,
            "page_size": page_size,
            "total_page": total_page,
            "total": total,
        },
    }


@router.get("")
def get_pending(
    keyword: str = Query(None),
    page_size: int = Query(10),
    current_page: int = Query(1),
):
    try:
        return _paginated([["status", "=", "Pending"]], keyword, page_size, current_page)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ✅ 3. Approve / Reject
# -----------------------------

@router.get("/history")
def get_history(
    keyword: str = Query(None),
    page_size: int = Query(10),
    current_page: int = Query(1),
):
    try:
        return _paginated([["status", "in", ["Approved", "Rejected"]]], keyword, page_size, current_page)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{name}/cancel")
def cancel_approval(name: str):
    try:
        # 1. get reference
        approval = requests.get(
            f"{FRAPPE_URL}/api/resource/Approval Request/{name}",
            headers=HEADERS,
        ).json()["data"]

        # 2. reset approval request to Pending
        requests.put(
            f"{FRAPPE_URL}/api/resource/Approval Request/{name}",
            headers=HEADERS,
            json={"status": "Pending", "approved_by": "", "approved_at": None, "comment": ""},
        )

        # 3. reset QI status back to Accepted
        inspection_name = approval.get("reference_name")
        if inspection_name:
            requests.put(
                f"{FRAPPE_URL}/api/resource/Quality Inspection/{inspection_name}",
                headers=HEADERS,
                json={"status": "Accepted"},
            )

        return {"message": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{name}")
def approve(name: str, action: str, user: str, comment: str = ""):
    try:
        status = "Approved" if action == "approve" else "Rejected"

        # 🔥 1. update approval request
        requests.put(
            f"{FRAPPE_URL}/api/resource/Approval Request/{name}",
            headers=HEADERS,
            json={
                "status": status,
                "approved_by": user,
                "approved_at": datetime.now().isoformat(),
                "comment": comment
            }
        )

        # 🔍 2. get reference inspection
        approval = requests.get(
            f"{FRAPPE_URL}/api/resource/Approval Request/{name}",
            headers=HEADERS
        ).json()["data"]

        inspection_name = approval["reference_name"]

        # 🔥 3. update Quality Inspection
        requests.put(
            f"{FRAPPE_URL}/api/resource/Quality Inspection/{inspection_name}",
            headers=HEADERS,
            json={
                "status": "Accepted" if action == "approve" else "Rejected"
            }
        )

        return {"message": "success"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
