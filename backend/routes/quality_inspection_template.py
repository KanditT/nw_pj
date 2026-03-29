from fastapi import HTTPException, APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import requests
import json

from config.config import FRAPPE_URL, HEADERS

router = APIRouter()
domain = "Quality Inspection Template"


# ── Doctype: Quality Inspection Template ─────────────────────────────────────

class QITemplateRowIn(BaseModel):
    """Child table: Item Quality Inspection Parameter"""
    specification: str          # references Quality Inspection Parameter name
    numeric: int = 0            # 1 = numeric check, 0 = text/visual check
    min_value: Optional[float] = None
    max_value: Optional[float] = None


class QITemplateIn(BaseModel):
    quality_inspection_template_name: str
    item_quality_inspection_parameter: list[QITemplateRowIn]


class QITemplateUpdate(BaseModel):
    quality_inspection_template_name: Optional[str] = None
    item_quality_inspection_parameter: Optional[list[QITemplateRowIn]] = None


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


MOCK_TEMPLATES = [
    {
        "quality_inspection_template_name": "Incoming Metal Parts",
        "parameters": [
            {"specification": "Dimension", "numeric": 1, "min_value": 9.8,  "max_value": 10.2},
            {"specification": "Hardness",  "numeric": 1, "min_value": 50.0, "max_value": 70.0},
        ],
    },
    {
        "quality_inspection_template_name": "Electrical Component Check",
        "parameters": [
            {"specification": "Electrical Conductivity", "numeric": 1, "min_value": 95.0, "max_value": 100.0},
            {"specification": "Weight",                  "numeric": 1, "min_value": 0.5,  "max_value": 2.0},
        ],
    },
    {
        "quality_inspection_template_name": "Pipe & Valve Inspection",
        "parameters": [
            {"specification": "Pressure Test", "numeric": 1, "min_value": 10.0, "max_value": 16.0},
            {"specification": "Dimension",     "numeric": 1, "min_value": 49.5, "max_value": 50.5},
        ],
    },
    {
        "quality_inspection_template_name": "Raw Material QC",
        "parameters": [
            {"specification": "Tensile Strength", "numeric": 1, "min_value": 400.0, "max_value": 600.0},
            {"specification": "Hardness",         "numeric": 1, "min_value": 55.0,  "max_value": 65.0},
        ],
    },
    {
        "quality_inspection_template_name": "General Incoming",
        "parameters": [
            {"specification": "Weight",    "numeric": 1, "min_value": 0.1, "max_value": 50.0},
            {"specification": "Dimension", "numeric": 1, "min_value": 9.5, "max_value": 10.5},
        ],
    },
]

@router.post("/mock-up-data")
def mock_up_data():
    # fetch available parameters
    param_res = requests.get(
        f"{FRAPPE_URL}/api/resource/Quality Inspection Parameter",
        headers=HEADERS,
        params={"limit_page_length": 200}
    )
    available = {p["name"] for p in param_res.json().get("data", [])}

    results = []
    for tmpl in MOCK_TEMPLATES:
        try:
            rows = [
                {"doctype": "Item Quality Inspection Parameter", **p}
                for p in tmpl["parameters"]
                if p["specification"] in available
            ]
            payload = {
                "doctype": "Quality Inspection Template",
                "quality_inspection_template_name": tmpl["quality_inspection_template_name"],
                "item_quality_inspection_parameter": rows,
            }
            res = requests.post(
                f"{FRAPPE_URL}/api/resource/Quality Inspection Template",
                json=payload,
                headers=HEADERS
            )
            results.append({"name": tmpl["quality_inspection_template_name"], "status": "ok"})
        except Exception as e:
            results.append({"name": tmpl["quality_inspection_template_name"], "status": "error", "detail": str(e)})

    return {"results": results}


@router.post("")
def create_template(data: QITemplateIn):
    try:
        rows = [
            {"doctype": "Item Quality Inspection Parameter", **row.model_dump(exclude_none=True)}
            for row in data.item_quality_inspection_parameter
        ]
        payload = {
            "doctype": domain,
            **data.model_dump(exclude={"item_quality_inspection_parameter"}),
            "item_quality_inspection_parameter": rows,
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
def update_template(name: str, data: QITemplateUpdate):
    try:
        body = data.model_dump(exclude_none=True)
        if "item_quality_inspection_parameter" in body:
            body["item_quality_inspection_parameter"] = [
                {"doctype": "Item Quality Inspection Parameter", **row.model_dump(exclude_none=True)}
                for row in (data.item_quality_inspection_parameter or [])
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
def delete_template(name: str):
    try:
        res = requests.delete(
            f"{FRAPPE_URL}/api/resource/{domain}/{name}",
            headers=HEADERS
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
