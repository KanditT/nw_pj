from fastapi import HTTPException, APIRouter, Query
import requests
import json

from config.config import FRAPPE_URL, API_KEY, API_SECRET

HEADERS = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Content-Type": "application/json",
    "Host": "frontend"
}

router = APIRouter()

domain = "Purchase Receipt"


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


@router.post("")
def create_purchase_receipt(data: dict):
    try:
        company_res = requests.get(
            f"{FRAPPE_URL}/api/resource/Company",
            headers=HEADERS,
            params={"limit_page_length": 1}
        )
        companies = company_res.json().get("data", [])
        company = companies[0]["name"] if companies else ""

        raw_items = data.pop("items", [])
        items = [{"doctype": "Purchase Receipt Item", **item} for item in raw_items]

        payload = {
            "doctype": domain,
            "company": company,
            "currency": "THB",
            "conversion_rate": 1.00,
            "items": items,
            **data
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
def update_purchase_receipt(name: str, data: dict):
    try:
        raw_items = data.pop("items", None)
        if raw_items is not None:
            data["items"] = [{"doctype": "Purchase Receipt Item", **item} for item in raw_items]

        res = requests.put(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            json=data,
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
