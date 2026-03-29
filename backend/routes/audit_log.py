from fastapi import HTTPException, APIRouter, Query
from typing import Optional
from datetime import datetime
import requests
import json

from config.config import FRAPPE_URL, HEADERS

router = APIRouter()
domain = "Audit Log"

FIELDS = ["name", "timestamp", "action", "document_type", "document_name", "user", "detail"]

ACTION_LABELS = [
    "create", "approve", "reject", "cancel", "cancel_approval", "delete"
]

DOCUMENT_TYPES = [
    "Quality Inspection", "Approval Request"
]


# ── Helper — called from other routes ────────────────────────────────────────

def log_action(
    action: str,
    document_type: str,
    document_name: str,
    user: str = "",
    detail: str = "",
):
    """Create an Audit Log entry. Never raises — audit failure must not break main operation."""
    try:
        res = requests.post(
            f"{FRAPPE_URL}/api/resource/{domain}",
            json={
                "doctype": domain,
                "timestamp": datetime.now().isoformat(),
                "action": action,
                "document_type": document_type,
                "document_name": document_name,
                "user": user,
                "detail": detail,
            },
            headers=HEADERS,
        )
        if res.status_code not in (200, 201):
            print(f"[audit_log] WARN {res.status_code}: {res.text[:200]}")
    except Exception as e:
        print(f"[audit_log] ERROR: {e}")


# ── GET /audit-logs ───────────────────────────────────────────────────────────

@router.get("")
def get_audit_logs(
    keyword: str = Query(None),
    action: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    page_size: int = Query(20),
    current_page: int = Query(1),
):
    try:
        base_url = f"{FRAPPE_URL}/api/resource/{domain}"
        start = (current_page - 1) * page_size

        filters = []
        if action:
            filters.append(["action", "=", action])
        if document_type:
            filters.append(["document_type", "=", document_type])

        params: dict = {
            "fields": json.dumps(FIELDS),
            "limit_page_length": page_size,
            "limit_start": start,
            "order_by": "timestamp desc",
        }
        count_params: dict = {}

        if filters:
            params["filters"] = json.dumps(filters)
            count_params["filters"] = json.dumps(filters)

        if keyword:
            or_filters = json.dumps([
                ["document_name", "like", f"%{keyword}%"],
                ["user", "like", f"%{keyword}%"],
                ["action", "like", f"%{keyword}%"],
            ])
            params["or_filters"] = or_filters
            count_params["or_filters"] = or_filters

        data = requests.get(base_url, headers=HEADERS, params=params).json().get("data", [])
        total = len(
            requests.get(base_url, headers=HEADERS, params={**count_params, "limit_page_length": 0})
            .json()
            .get("data", [])
        )
        total_page = max((total + page_size - 1) // page_size, 1)

        return {
            "data": data,
            "pagination": {
                "current_page": current_page,
                "page_size": page_size,
                "total_page": total_page,
                "total": total,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
