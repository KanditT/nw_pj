from fastapi import HTTPException, APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import requests
import json

from config.config import FRAPPE_URL, HEADERS

router = APIRouter()

domain = "Supplier"


# ── Doctype: Supplier ─────────────────────────────────────────────────────────

class SupplierIn(BaseModel):
    supplier_name: str
    supplier_type: str  # e.g. "Company", "Individual", "Partnership"


class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = None
    supplier_type: Optional[str] = None


@router.get("")
def get_suppliers(
    keyword: str = Query(None),
    page_size: int = Query(10),
    current_page: int = Query(1)
):
    try:
        base_url = f"{FRAPPE_URL}/api/resource/{domain}"
        start = (current_page - 1) * page_size

        params = {
            "fields": json.dumps(["name", "supplier_name", "supplier_type"]),
            "limit_page_length": page_size,
            "limit_start": start
        }

        filters = None
        if keyword:
            filters = [
                ["supplier_name", "like", f"%{keyword}%"]
            ]
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
def get_supplier(name: str):
    try:
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


MOCK_SUPPLIERS = [
    {"supplier_name": "Thai Steel Co., Ltd.",       "supplier_type": "Company"},
    {"supplier_name": "Bangkok Pipe Supply",         "supplier_type": "Company"},
    {"supplier_name": "Sirichai Engineering",        "supplier_type": "Company"},
    {"supplier_name": "Pro-Parts Thailand",          "supplier_type": "Company"},
    {"supplier_name": "Eastern Valve & Fitting",     "supplier_type": "Company"},
    {"supplier_name": "Nakorn Electric Co.",         "supplier_type": "Company"},
    {"supplier_name": "Somchai Industrial Parts",    "supplier_type": "Individual"},
    {"supplier_name": "Wanchai Rubber & Seal",       "supplier_type": "Individual"},
    {"supplier_name": "PTT Lubricants Partnership",  "supplier_type": "Partnership"},
    {"supplier_name": "Rayong Filter & Gasket",      "supplier_type": "Company"},
]

@router.post("/mock-up-data")
def mock_up_data():
    results = []
    for s in MOCK_SUPPLIERS:
        try:
            payload = {"doctype": domain, **s}
            res = requests.post(
                f"{FRAPPE_URL}/api/resource/{domain}",
                json=payload,
                headers=HEADERS
            )
            results.append({"supplier_name": s["supplier_name"], "status": "ok"})
        except Exception as e:
            results.append({"supplier_name": s["supplier_name"], "status": "error", "detail": str(e)})
    return {"results": results}


@router.post("")
def create_supplier(data: SupplierIn):
    try:
        payload = {"doctype": domain, **data.model_dump()}
        res = requests.post(
            f"{FRAPPE_URL}/api/resource/{domain}",
            json=payload,
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{name}")
def update_supplier(name: str, data: SupplierUpdate):
    try:
        res = requests.put(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            json=data.model_dump(exclude_none=True),
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{name}")
def delete_supplier(name: str):
    try:
        res = requests.delete(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
