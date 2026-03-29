from fastapi import HTTPException, APIRouter, Query
import requests
import json

from config.config import FRAPPE_URL, HEADERS

router = APIRouter()
domain = "Quality Inspection"

SUBMIT_HEADERS = {
    **HEADERS,
    "Content-Type": "application/json",
}


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
            "fields": json.dumps(["name", "status", "report_date", "item_code", "inspected_by"]),
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
def create_quality_inspection(data: dict):
    try:
        raw_readings = data.pop("readings", [])
        readings = [{"doctype": "Quality Inspection Reading", **r}
                    for r in raw_readings]

        payload = {
            "doctype": domain,
            "docstatus": 1,
            "readings": readings,
            **data
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

        return {
            "inspection": inspection,
            "message": "Inspection created + approval created"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{name}")
def update_quality_inspection(name: str, data: dict):
    try:
        raw_readings = data.pop("readings", None)
        if raw_readings is not None:
            data["readings"] = [
                {"doctype": "Quality Inspection Reading", **r} for r in raw_readings
            ]

        res = requests.put(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            json=data,
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{name}/cancel")
def cancel_quality_inspection(name: str):
    try:
        # Set docstatus=2 (cancelled) via PUT
        res = requests.put(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            json={"docstatus": 2},
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{name}")
def delete_quality_inspection(name: str):
    try:
        res = requests.delete(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
