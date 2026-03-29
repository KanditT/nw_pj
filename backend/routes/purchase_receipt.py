from fastapi import HTTPException, APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import requests
import json

from config.config import FRAPPE_URL, HEADERS

router = APIRouter()

domain = "Purchase Receipt"


# ── Doctype: Purchase Receipt ─────────────────────────────────────────────────
# company, currency, conversion_rate are auto-filled by the backend

class PurchaseReceiptItemIn(BaseModel):
    """Child table: Purchase Receipt Item"""
    item_code: str
    qty: float
    rate: float


class PurchaseReceiptIn(BaseModel):
    naming_series: str = "MAT-PRE-.YYYY.-"
    supplier: str
    posting_date: str           # YYYY-MM-DD
    posting_time: str           # HH:MM:SS
    items: list[PurchaseReceiptItemIn]


class PurchaseReceiptUpdate(BaseModel):
    naming_series: Optional[str] = None
    supplier: Optional[str] = None
    posting_date: Optional[str] = None
    posting_time: Optional[str] = None
    items: Optional[list[PurchaseReceiptItemIn]] = None


@router.get("")
def get_purchase_receipts(
    keyword: str = Query(None),
    page_size: int = Query(10),
    current_page: int = Query(1)
):
    try:
        base_url = f"{FRAPPE_URL}/api/resource/{domain}"
        start = (current_page - 1) * page_size

        params = {
            "fields": json.dumps(["name", "supplier", "posting_date"]),
            "limit_page_length": page_size,
            "limit_start": start
        }

        filters = None
        if keyword:
            filters = [["supplier", "like", f"%{keyword}%"]]
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
def get_purchase_receipt(name: str):
    try:
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mock-up-data")
def mock_up_data():
    import datetime, random

    # fetch first company
    company_res = requests.get(
        f"{FRAPPE_URL}/api/resource/Company",
        headers=HEADERS,
        params={"limit_page_length": 1}
    )
    companies = company_res.json().get("data", [])
    company = companies[0]["name"] if companies else ""

    # fetch suppliers
    sup_res = requests.get(
        f"{FRAPPE_URL}/api/resource/Supplier",
        headers=HEADERS,
        params={"limit_page_length": 20}
    )
    suppliers = [s["name"] for s in sup_res.json().get("data", [])]
    if not suppliers:
        return {"error": "No suppliers found. Please add suppliers first."}

    # fetch items
    item_res = requests.get(
        f"{FRAPPE_URL}/api/resource/Item",
        headers=HEADERS,
        params={"limit_page_length": 50, "fields": json.dumps(["name"])}
    )
    items = [i["name"] for i in item_res.json().get("data", [])]
    if not items:
        return {"error": "No items found. Please add items first."}

    today = datetime.date.today()
    results = []

    for i in range(10):
        post_date = today - datetime.timedelta(days=random.randint(0, 30))
        supplier = suppliers[i % len(suppliers)]
        picked_items = random.sample(items, min(2, len(items)))

        payload = {
            "doctype": domain,
            "naming_series": "MAT-PRE-.YYYY.-",
            "supplier": supplier,
            "company": company,
            "currency": "THB",
            "conversion_rate": 1.00,
            "posting_date": post_date.strftime("%Y-%m-%d"),
            "posting_time": f"{random.randint(8,17):02d}:{random.randint(0,59):02d}:00",
            "items": [
                {
                    "doctype": "Purchase Receipt Item",
                    "item_code": item,
                    "qty": random.randint(1, 50),
                    "rate": round(random.uniform(100, 5000), 2),
                }
                for item in picked_items
            ],
        }
        try:
            res = requests.post(
                f"{FRAPPE_URL}/api/resource/{domain}",
                json=payload,
                headers=HEADERS
            )
            results.append({"index": i + 1, "status": "ok"})
        except Exception as e:
            results.append({"index": i + 1, "status": "error", "detail": str(e)})

    return {"results": results}


@router.post("")
def create_purchase_receipt(data: PurchaseReceiptIn):
    try:
        company_res = requests.get(
            f"{FRAPPE_URL}/api/resource/Company",
            headers=HEADERS,
            params={"limit_page_length": 1}
        )
        companies = company_res.json().get("data", [])
        company = companies[0]["name"] if companies else ""

        items = [{"doctype": "Purchase Receipt Item", **item.model_dump()} for item in data.items]

        payload = {
            "doctype": domain,
            "company": company,
            "currency": "THB",
            "conversion_rate": 1.00,
            **data.model_dump(exclude={"items"}),
            "items": items,
        }

        res = requests.post(
            f"{FRAPPE_URL}/api/resource/{domain}",
            json=payload,
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{name}")
def update_purchase_receipt(name: str, data: PurchaseReceiptUpdate):
    try:
        body = data.model_dump(exclude_none=True)
        if "items" in body:
            body["items"] = [
                {"doctype": "Purchase Receipt Item", **item.model_dump()}
                for item in (data.items or [])
            ]

        res = requests.put(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            json=body,
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{name}")
def delete_purchase_receipt(name: str):
    try:
        res = requests.delete(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
