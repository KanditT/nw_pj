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
domain = "Quality Inspection Template"


@router.get("")
def get_templates(
    keyword: str = Query(None),
    page_size: int = Query(10),
    current_page: int = Query(1)
):
    try:
        base_url = f"{FRAPPE_URL}/api/resource/{domain}"
        start = (current_page - 1) * page_size

        params = {
            "fields": json.dumps(["name", "quality_inspection_template_name"]),
            "limit_page_length": page_size,
            "limit_start": start
        }

        filters = None
        if keyword:
            filters = [["quality_inspection_template_name", "like", f"%{keyword}%"]]
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
def get_template(name: str):
    try:
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
def create_template(data: dict):
    try:
        raw_rows = data.pop("item_quality_inspection_parameter", [])
        rows = [{"doctype": "Item Quality Inspection Parameter", **row} for row in raw_rows]

        payload = {
            "doctype": domain,
            "item_quality_inspection_parameter": rows,
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
def update_template(name: str, data: dict):
    try:
        raw_rows = data.pop("item_quality_inspection_parameter", None)
        if raw_rows is not None:
            data["item_quality_inspection_parameter"] = [
                {"doctype": "Item Quality Inspection Parameter", **row} for row in raw_rows
            ]

        res = requests.put(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            json=data,
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{name}")
def delete_template(name: str):
    try:
        res = requests.delete(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
