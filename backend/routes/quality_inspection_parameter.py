from fastapi import HTTPException, APIRouter, Query
import requests
import json

from config.config import FRAPPE_URL, HEADERS

router = APIRouter()
domain = "Quality Inspection Parameter"


@router.get("")
def get_parameters(
    keyword: str = Query(None),
    page_size: int = Query(10),
    current_page: int = Query(1)
):
    try:
        base_url = f"{FRAPPE_URL}/api/resource/{domain}"
        start = (current_page - 1) * page_size

        params = {
            "fields": json.dumps(["name"]),
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


@router.get("/all")
def get_all_parameters():
    """Used by comboboxes — returns full list without pagination."""
    try:
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/{domain}",
            headers=HEADERS,
            params={"limit_page_length": 500}
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


MOCK_PARAMETERS = [
    "Dimension",
    "Surface Finish",
    "Hardness",
    "Tensile Strength",
    "Chemical Composition",
    "Visual Inspection",
    "Weight",
    "Corrosion Resistance",
    "Pressure Test",
    "Electrical Conductivity",
]

@router.post("/mock-up-data")
def mock_up_data():
    results = []
    for param in MOCK_PARAMETERS:
        try:
            payload = {"doctype": domain, "parameter": param}
            res = requests.post(
                f"{FRAPPE_URL}/api/resource/{domain}",
                json=payload,
                headers=HEADERS
            )
            results.append({"parameter": param, "status": "ok"})
        except Exception as e:
            results.append({"parameter": param, "status": "error", "detail": str(e)})
    return {"results": results}


@router.post("")
def create_parameter(data: dict):
    try:
        payload = {"doctype": domain, **data}
        res = requests.post(
            f"{FRAPPE_URL}/api/resource/{domain}",
            json=payload,
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{name}")
def delete_parameter(name: str):
    try:
        res = requests.delete(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
