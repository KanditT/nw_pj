from fastapi import FastAPI, HTTPException
import requests
from routes import item, item_group, supplier, purchase_receipt, quality_inspection_parameter, quality_inspection_template, quality_inspection, user, approve
from fastapi.middleware.cors import CORSMiddleware
import json

from config.config import FRAPPE_URL, API_KEY, API_SECRET, HEADERS

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # หรือ ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_approval_doctype():
    try:
        # 🔍 1. check exist
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/DocType/Approval Request",
            headers=HEADERS
        )

        if res.status_code == 200:
            print("✅ Doctype already exists")
            return

    except:
        pass

    # 🚀 2. create doctype
    payload = {
        "doctype": "DocType",
        "name": "Approval Request",
        "module": "Core",
        "custom": 1,
        "fields": [
            {
                "fieldname": "reference_doctype",
                "fieldtype": "Data",
                "label": "Reference Doctype"
            },
            {
                "fieldname": "reference_name",
                "fieldtype": "Data",
                "label": "Reference Name"
            },
            {
                "fieldname": "status",
                "fieldtype": "Select",
                "label": "Status",
                "options": "Pending\nApproved\nRejected",
                "default": "Pending"
            },
            {
                "fieldname": "approved_by",
                "fieldtype": "Data",
                "label": "Approved By"
            },
            {
                "fieldname": "approved_at",
                "fieldtype": "Datetime",
                "label": "Approved At"
            },
            {
                "fieldname": "comment",
                "fieldtype": "Text",
                "label": "Comment"
            }
        ]
    }

    res = requests.post(
        f"{FRAPPE_URL}/api/resource/DocType",
        json=payload,
        headers=HEADERS
    )
    
    perm_payload = {
        "doctype": "Custom DocPerm",
        "parent": "Approval Request",
        "parenttype": "DocType",
        "parentfield": "permissions",
        "role": "All",  # 🔥 ให้ใช้ได้ทุกคน
        "read": 1,
        "write": 1,
        "create": 1,
        "delete": 1
    }

    requests.post(
        f"{FRAPPE_URL}/api/resource/Custom DocPerm",
        json=perm_payload,
        headers=HEADERS
    )

    print("🚀 Create Doctype:", res.status_code, res.text)

@app.on_event("startup")
def startup():
    ensure_approval_doctype()


app.include_router(item.router, prefix="/items", tags=["items"])
app.include_router(item_group.router, prefix="/item-groups",
                   tags=["item-groups"])
app.include_router(supplier.router, prefix="/suppliers", tags=["suppliers"])
app.include_router(purchase_receipt.router,
                   prefix="/purchase-receipts", tags=["purchase-receipts"])
app.include_router(quality_inspection_parameter.router,
                   prefix="/quality-inspection-parameters", tags=["quality-inspection-parameters"])
app.include_router(quality_inspection_template.router,
                   prefix="/quality-inspection-templates", tags=["quality-inspection-templates"])
app.include_router(quality_inspection.router,
                   prefix="/quality-inspections", tags=["quality-inspections"])
app.include_router(user.router, prefix="/users", tags=["users"])
app.include_router(approve.router, prefix="/approvals", tags=["approvals"])
