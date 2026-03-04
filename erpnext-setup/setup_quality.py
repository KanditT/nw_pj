"""
ERPNext Quality Module Setup Script
Run after ERPNext is up to configure webhooks and workflow.

Usage:
  python erpnext-setup/setup_quality.py \
    --url http://localhost:8080 \
    --api-key KEY \
    --api-secret SECRET
"""
import json
import argparse
import http.client
import urllib.parse


def make_request(base_url: str, method: str, endpoint: str, data: dict | None = None, token: str = "") -> tuple[int, dict]:
    parsed = urllib.parse.urlparse(base_url)
    host = parsed.netloc
    path = f"/api/{endpoint}"
    body = json.dumps(data).encode() if data else b""

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"token {token}",
        "Expect": "",
        "Content-Length": str(len(body)),
    }

    conn = http.client.HTTPConnection(host, timeout=30)
    conn.request(method, path, body=body, headers=headers)
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    try:
        return resp.status, json.loads(raw)
    except Exception:
        return resp.status, {"raw": raw}


def ensure_role(base_url: str, token: str, role_name: str):
    status, _ = make_request(base_url, "GET", f"resource/Role/{urllib.parse.quote(role_name)}", token=token)
    if status == 404:
        print(f"  Creating role: {role_name}")
        make_request(base_url, "POST", "resource/Role", {"doctype": "Role", "role_name": role_name}, token)


def setup_webhook(base_url: str, token: str, quality_service_url: str, webhook_secret: str):
    print("Creating ERPNext webhook for Quality Inspection...")

    # Check if already exists
    f = urllib.parse.quote('=[["webhook_doctype","=","Quality Inspection"]]')
    status, data = make_request(base_url, "GET", f"resource/Webhook?filters{f}", token=token)
    if status == 200 and data.get("data"):
        print("  Webhook already exists, skipping.")
        return

    payload = {
        "doctype": "Webhook",
        "name": "quality-inspection-submit",
        "webhook_doctype": "Quality Inspection",
        "webhook_docevent": "on_submit",
        "request_url": f"{quality_service_url}/api/v1/webhooks/erpnext",
        "request_method": "POST",
        "request_structure": "JSON",
        "enabled": 1,
        "webhook_headers": [
            {"key": "X-Webhook-Secret", "value": webhook_secret},
            {"key": "Content-Type",     "value": "application/json"},
        ],
        "webhook_data": [
            {"fieldname": "name",      "key": "name"},
            {"fieldname": "status",    "key": "status"},
            {"fieldname": "item_code", "key": "item_code"},
        ],
    }
    status, result = make_request(base_url, "POST", "resource/Webhook", payload, token)
    if status in (200, 201):
        print(f"  Webhook created: {result.get('data', {}).get('name')}")
    else:
        print(f"  Webhook error ({status}): {str(result)[:200]}")


def ensure_workflow_state(base_url: str, token: str, state_name: str, style: str = ""):
    """ERPNext requires Workflow State documents to exist before creating a Workflow."""
    encoded = urllib.parse.quote(state_name)
    status, _ = make_request(base_url, "GET", f"resource/Workflow%20State/{encoded}", token=token)
    if status != 200:
        make_request(base_url, "POST", "resource/Workflow%20State",
                     {"doctype": "Workflow State", "workflow_state_name": state_name, "style": style}, token)


def ensure_workflow_action(base_url: str, token: str, action_name: str):
    """ERPNext requires Workflow Action Master documents to exist before creating a Workflow."""
    encoded = urllib.parse.quote(action_name)
    status, _ = make_request(base_url, "GET", f"resource/Workflow%20Action%20Master/{encoded}", token=token)
    if status != 200:
        make_request(base_url, "POST", "resource/Workflow%20Action%20Master",
                     {"doctype": "Workflow Action Master", "workflow_action_name": action_name}, token)


def setup_workflow(base_url: str, token: str):
    print("Creating Quality Inspection workflow...")

    # Check if already exists
    wf_name = urllib.parse.quote("Quality Approval Workflow")
    status, data = make_request(base_url, "GET", f"resource/Workflow/{wf_name}", token=token)
    if status == 200:
        print("  Workflow already exists, skipping.")
        return

    # ERPNext validates transitions against existing Workflow State and Action Master documents
    print("  Creating workflow states...")
    ensure_workflow_state(base_url, token, "Draft",    "")
    ensure_workflow_state(base_url, token, "Pending",  "Warning")
    ensure_workflow_state(base_url, token, "Approved", "Success")
    ensure_workflow_state(base_url, token, "Rejected", "Danger")

    print("  Creating workflow actions...")
    ensure_workflow_action(base_url, token, "Submit for Approval")
    ensure_workflow_action(base_url, token, "Approve")
    ensure_workflow_action(base_url, token, "Reject")

    payload = {
        "doctype": "Workflow",
        "workflow_name": "Quality Approval Workflow",
        "document_type": "Quality Inspection",
        "is_active": 1,
        "send_email_alert": 0,
        "workflow_state_field": "workflow_state",
        "states": [
            {"state": "Draft",    "doc_status": "0", "allow_edit": "System Manager"},
            {"state": "Pending",  "doc_status": "0", "allow_edit": "System Manager"},
            {"state": "Approved", "doc_status": "1", "allow_edit": "System Manager"},
            {"state": "Rejected", "doc_status": "1", "allow_edit": "System Manager"},
        ],
        "transitions": [
            {"state": "Draft",   "action": "Submit for Approval", "next_state": "Pending",  "allowed": "System Manager"},
            {"state": "Pending", "action": "Approve",             "next_state": "Approved", "allowed": "System Manager"},
            {"state": "Pending", "action": "Reject",              "next_state": "Rejected", "allowed": "System Manager"},
        ],
    }
    status, result = make_request(base_url, "POST", "resource/Workflow", payload, token)
    if status in (200, 201):
        print(f"  Workflow created: {result.get('data', {}).get('name')}")
    else:
        print(f"  Workflow error ({status}): {str(result)[:200]}")


def main():
    parser = argparse.ArgumentParser(description="Setup ERPNext for Quality Service")
    parser.add_argument("--url", default="http://localhost:8080")
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--api-secret", required=True)
    parser.add_argument("--quality-service-url", default="http://quality-service:8000")
    parser.add_argument("--webhook-secret", default="webhook-secret")
    args = parser.parse_args()

    token = f"{args.api_key}:{args.api_secret}"
    print(f"Connecting to ERPNext at {args.url}...")

    setup_webhook(args.url, token, args.quality_service_url, args.webhook_secret)
    setup_workflow(args.url, token)
    print("\nSetup complete!")
    print("\nNext steps:")
    print("  Quality UI  → http://localhost:3000")
    print("  API Docs    → http://localhost:8000/docs")
    print("  ERPNext     → http://localhost:8080")


if __name__ == "__main__":
    main()
