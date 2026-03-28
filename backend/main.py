from fastapi import FastAPI, HTTPException
import requests
from routes import item, item_group, supplier
from fastapi.middleware.cors import CORSMiddleware
import json

from config.config import FRAPPE_URL, API_KEY, API_SECRET

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # หรือ ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HEADERS = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Content-Type": "application/json",
    "Host": "frontend"
}

# -----------------------------
# 🏠 Root
# -----------------------------
@app.get("/")
def root():
    return {"message": "FastAPI + Frappe connected 🚀"}


# -----------------------------
# 📥 GET all inspections
# -----------------------------
@app.get("/inspections")
def get_inspections():
    try:
        params = {
            "filters": json.dumps([
                ["docstatus", "=", 1]
            ])
        }
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/Quality Inspection",
            headers=HEADERS,
            params=params
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# 🔍 GET single inspection
# -----------------------------
@app.get("/inspections/{name}")
def get_inspection(name: str):
    try:
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/Quality Inspection/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ➕ CREATE inspection
# -----------------------------
@app.post("/inspections")
def create_inspection(data: dict):
    try:
        payload = {
            "doctype": "Quality Inspection",
            **data
        }

        res = requests.post(
            f"{FRAPPE_URL}/api/resource/Quality Inspection",
            json=payload,
            headers=HEADERS
        )

        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ✏️ UPDATE inspection
# -----------------------------
@app.put("/inspections/{name}")
def update_inspection(name: str, data: dict):
    try:
        res = requests.put(
            f"{FRAPPE_URL}/api/resource/Quality Inspection/{name}",
            json=data,
            headers=HEADERS
        )

        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------
# ❌ DELETE inspection
# -----------------------------
@app.delete("/inspections/{name}")
def delete_inspection(name: str):
    try:
        res = requests.delete(
            f"{FRAPPE_URL}/api/resource/Quality Inspection/{name}",
            headers=HEADERS
        )

        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
app.include_router(item.router, prefix="/items", tags=["items"])
app.include_router(item_group.router, prefix="/item-groups", tags=["item-groups"])
app.include_router(supplier.router, prefix="/suppliers", tags=["suppliers"])
