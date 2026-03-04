"""HTTP client for ERPNext REST API.
All communication with ERPNext goes through this module — no direct DB access.
"""
import httpx
from app.config import settings


def _auth_headers() -> dict:
    if settings.erpnext_api_key and settings.erpnext_api_secret:
        return {"Authorization": f"token {settings.erpnext_api_key}:{settings.erpnext_api_secret}"}
    return {}


async def get_quality_inspection(name: str) -> dict | None:
    url = f"{settings.erpnext_url}/api/resource/Quality Inspection/{name}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=_auth_headers())
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json().get("data")


async def create_quality_inspection(payload: dict) -> dict:
    url = f"{settings.erpnext_url}/api/resource/Quality Inspection"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=_auth_headers())
        resp.raise_for_status()
        return resp.json().get("data")


async def update_quality_inspection(name: str, payload: dict) -> dict:
    url = f"{settings.erpnext_url}/api/resource/Quality Inspection/{name}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.put(url, json=payload, headers=_auth_headers())
        resp.raise_for_status()
        return resp.json().get("data")


async def submit_quality_inspection(name: str) -> dict:
    url = f"{settings.erpnext_url}/api/resource/Quality Inspection/{name}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.put(url, json={"docstatus": 1}, headers=_auth_headers())
        resp.raise_for_status()
        return resp.json().get("data")


async def list_quality_inspections(filters: list | None = None) -> list:
    params = {"fields": '["name","item_code","status","creation"]', "limit": 50}
    if filters:
        import json
        params["filters"] = json.dumps(filters)
    url = f"{settings.erpnext_url}/api/resource/Quality Inspection"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params, headers=_auth_headers())
        resp.raise_for_status()
        return resp.json().get("data", [])


async def get_workflow_state(doctype: str, name: str) -> str | None:
    data = await get_quality_inspection(name) if doctype == "Quality Inspection" else None
    if data:
        return data.get("workflow_state")
    return None


async def trigger_workflow_action(doctype: str, name: str, action: str) -> dict:
    url = f"{settings.erpnext_url}/api/method/frappe.model.workflow.apply_workflow"
    payload = {"doc": {"doctype": doctype, "name": name}, "action": action}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=_auth_headers())
        resp.raise_for_status()
        return resp.json()


async def health_check() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.erpnext_url}/api/method/ping")
            return resp.status_code == 200
    except Exception:
        return False
