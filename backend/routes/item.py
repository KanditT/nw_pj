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
# 🧪 MOCK UP DATA
# -----------------------------
MOCK_ITEMS = [
    {"item_code": "BOLT-M8-SS",    "item_name": "Stainless Bolt M8",       "item_group": "Raw Material"},
    {"item_code": "PIPE-50-GI",    "item_name": "Galvanized Iron Pipe 50mm","item_group": "Raw Material"},
    {"item_code": "VALVE-GATE-2",  "item_name": "Gate Valve 2 inch",        "item_group": "Raw Material"},
    {"item_code": "CABLE-NYY-4C",  "item_name": "NYY Cable 4 Core",         "item_group": "Raw Material"},
    {"item_code": "PUMP-CENT-3HP", "item_name": "Centrifugal Pump 3HP",     "item_group": "Products"},
    {"item_code": "MOTOR-AC-5HP",  "item_name": "AC Motor 5HP 380V",        "item_group": "Products"},
    {"item_code": "FILTER-BAG-25", "item_name": "Bag Filter 25 Micron",     "item_group": "Consumable"},
    {"item_code": "GLOVE-NITR-L",  "item_name": "Nitrile Glove Size L",     "item_group": "Consumable"},
    {"item_code": "GAUGE-PRES-60", "item_name": "Pressure Gauge 0-60 PSI",  "item_group": "Products"},
    {"item_code": "SEAL-ORING-25", "item_name": "O-Ring Seal 25mm",         "item_group": "Raw Material"},
]

@router.post("/mock-up-data")
def mock_up_data():
    results = []
    for item in MOCK_ITEMS:
        try:
            payload = {
                "doctype": domain,
                "item_code": item["item_code"],
                "item_name": item["item_name"],
                "item_group": item["item_group"],
                "stock_uom": "Nos",
                "inspection_required_before_purchase": 1,
            }
            res = requests.post(
                f"{FRAPPE_URL}/api/resource/{domain}",
                json=payload,
                headers=HEADERS
            )
            results.append({"item_code": item["item_code"], "status": "ok"})
        except Exception as e:
            results.append({"item_code": item["item_code"], "status": "error", "detail": str(e)})
    return {"results": results}


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
