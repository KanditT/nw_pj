from fastapi import FastAPI, HTTPException
import requests
from routes import item, item_group, supplier, purchase_receipt, quality_inspection_parameter, quality_inspection_template, quality_inspection, user, approve, audit_log
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

def ensure_audit_log_doctype():
    try:
        res = requests.get(f"{FRAPPE_URL}/api/resource/DocType/Audit Log", headers=HEADERS)
        if res.status_code == 200:
            # Fix autoname if it was created with wrong format
            requests.put(
                f"{FRAPPE_URL}/api/resource/DocType/Audit Log",
                json={"autoname": "AUDIT-.YYYY.-.#####"},
                headers=HEADERS,
            )
            print("✅ Audit Log doctype already exists")
            return
    except:
        pass

    payload = {
        "doctype": "DocType",
        "name": "Audit Log",
        "module": "Core",
        "custom": 1,
        "autoname": "AUDIT-.YYYY.-.#####",
        "sort_field": "timestamp",
        "sort_order": "DESC",
        "fields": [
            {"fieldname": "timestamp",     "fieldtype": "Datetime", "label": "Timestamp",     "reqd": 1, "in_list_view": 1},
            {"fieldname": "action",        "fieldtype": "Data",     "label": "Action",        "reqd": 1, "in_list_view": 1},
            {"fieldname": "document_type", "fieldtype": "Data",     "label": "Document Type", "in_list_view": 1},
            {"fieldname": "document_name", "fieldtype": "Data",     "label": "Document Name", "in_list_view": 1},
            {"fieldname": "user",          "fieldtype": "Data",     "label": "User",          "in_list_view": 1},
            {"fieldname": "detail",        "fieldtype": "Long Text","label": "Detail"},
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
    }

    res = requests.post(f"{FRAPPE_URL}/api/resource/DocType", json=payload, headers=HEADERS)
    print("🚀 Create Audit Log DocType:", res.status_code, res.text[:300])


@app.on_event("startup")
def startup():
    ensure_approval_doctype()
    ensure_audit_log_doctype()


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
app.include_router(audit_log.router, prefix="/audit-logs", tags=["audit-logs"])
