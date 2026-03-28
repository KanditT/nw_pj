from fastapi import HTTPException, APIRouter, Query
import requests
import os
import json

from config.config import FRAPPE_URL, API_KEY, API_SECRET, ERPNEXT_USER, ERPNEXT_PASSWORD

HEADERS = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Content-Type": "application/json",
    "Host": "frontend"
}

router = APIRouter()

domain = "Item"

# -----------------------------
# 📥 GET all items
# -----------------------------


@router.get("")
def get_items(
    keyword: str = Query(None),
    page_size: int = Query(10),
    current_page: int = Query(1)
):
    try:
        base_url = f"{FRAPPE_URL}/api/resource/Item"

        # 🔥 คำนวณ start จาก page
        start = (current_page - 1) * page_size

        # -----------------------
        # 📦 main query
        # -----------------------
        params = {
            "fields": json.dumps(["name", "item_name", "item_group"]),
            "limit_page_length": page_size,
            "limit_start": start
        }

        filters = None

        if keyword:
            filters = [
                ["name", "like", f"%{keyword}%"],
                ["item_name", "like", f"%{keyword}%"]
            ]
            params["or_filters"] = json.dumps(filters)

        res = requests.get(base_url, headers=HEADERS, params=params)
        data = res.json().get("data", [])

        # -----------------------
        # 🔢 total count query
        # -----------------------
        count_params = {}

        if keyword:
            count_params["or_filters"] = json.dumps(filters)

        count_res = requests.get(
            base_url,
            headers=HEADERS,
            params={
                **count_params,
                "limit_page_length": 0
            }
        )

        total = len(count_res.json().get("data", []))

        # -----------------------
        # 📊 pagination
        # -----------------------
        total_page = (total + page_size - 1) // page_size

        return {
            "data": data,
            "pagination": {
                "current_page": current_page,
                "page_size": page_size,   # 🔥 เปลี่ยนชื่อ
                "total_page": total_page,
                "total": total
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# 🔍 GET single item
# -----------------------------
@router.get("/{name}")
def get_item(name: str):
    try:
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ➕ CREATE inspection
# -----------------------------
@router.post("")
def create_inspection(data: dict):
    try:
        payload = {
            "doctype": domain,
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


# -----------------------------
# ✏️ UPDATE inspection
# -----------------------------
@router.put("/{name}")
def update_inspection(name: str, data: dict):
    try:
        res = requests.put(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            json=data,
            headers=HEADERS
        )

        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ❌ DELETE inspection
# -----------------------------
@router.delete("/{name}")
def delete_inspection(name: str):
    try:
        res = requests.delete(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )

        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
