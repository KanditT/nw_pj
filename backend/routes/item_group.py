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

domain = "Item Group"

# -----------------------------
# 📥 GET all items
# -----------------------------


@router.get("")
def get_items():
    try:
        base_url = f"{FRAPPE_URL}/api/resource/{domain}"

        params = {
            "fields": json.dumps(["name", "parent_item_group"]),
        }
        res = requests.get(base_url, headers=HEADERS, params=params)
        data = res.json().get("data", [])

        return {
            "data": data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
