# Quality Service — ERPNext Microservice Stack

Quality Inspection & Approval system built on:
- **ERPNext v15** — System of Record (Quality Inspection DocType)
- **quality-service** — FastAPI microservice (rule engine, approval engine, audit logs)
- **quality-ui** — Next.js 14 + shadCN web dashboard
- **quality-avalonia** — Avalonia UI desktop client (runs locally, connects to quality-service)

---

## Quick Start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start everything
docker compose up -d

# 3. Wait for ERPNext site to be created (~3-5 min on first run)
docker compose logs -f create-site
```

### Access Points

| Service          | URL                        | Credentials        |
|------------------|----------------------------|--------------------|
| ERPNext          | http://localhost:8080      | admin / admin      |
| Quality Service  | http://localhost:8000      | —                  |
| API Docs         | http://localhost:8000/docs | —                  |
| Quality UI       | http://localhost:3000      | —                  |

---

## Architecture

```
Avalonia Desktop Client
        │
        ▼
quality-service (FastAPI :8000)
  ├── Rule Engine          ← validates inspection readings
  ├── Approval Engine      ← approval workflow
  ├── Audit Logger         ← immutable audit trail (PostgreSQL)
  └── ERPNext Client       ← REST API only, no direct DB
        │
        ▼ REST API + Webhooks
ERPNext (:8080)
  └── Quality Inspection DocType
  └── Workflow Engine
  └── Webhooks → quality-service
```

**Rules:**
- ERPNext is the System of Record — never connect to its DB directly
- All communication via REST API (`/api/resource/*`) and Webhooks
- quality-service owns the audit trail (PostgreSQL)

---

## After First Start — ERPNext Setup

### Get API Key
1. Login to ERPNext: http://localhost:8080 (Administrator/admin)
2. Go to **Settings → My Account → API Access**
3. Generate API Key + Secret
4. Add to `.env`:
   ```
   ERPNEXT_API_KEY=your_key
   ERPNEXT_API_SECRET=your_secret
   ```
5. Restart quality-service: `docker compose restart quality-service`

### Configure Webhook + Workflow
```bash
python erpnext-setup/setup_quality.py \
  --url http://localhost:8080 \
  --api-key YOUR_KEY \
  --api-secret YOUR_SECRET \
  --quality-service-url http://quality-service:8000 \
  --webhook-secret webhook-secret

python erpnext-setup/setup_quality.py --url http://localhost:8080 --api-key f0d02cc8e9ff4ad --api-secret f12f0e10466dc6a --quality-service-url http://quality-service:8000 --webhook-secret webhook-secret-shared-with-erpnext

python erpnext-setup/setup_quality.py --url http://localhost:8080 --api-key f0d02cc8e9ff4ad --api-secret f12f0e10466dc6a --quality-service-url http://quality-service:8000 --webhook-secret webhook-secret


```

---

## API Reference (quality-service)

Full docs at http://localhost:8000/docs

| Method | Endpoint                              | Description                  |
|--------|---------------------------------------|------------------------------|
| GET    | /api/v1/inspections/                  | List inspections              |
| POST   | /api/v1/inspections/                  | Create inspection             |
| GET    | /api/v1/inspections/{id}              | Get inspection detail         |
| PUT    | /api/v1/inspections/{id}              | Update inspection             |
| POST   | /api/v1/inspections/{id}/validate     | Run rule validation           |
| POST   | /api/v1/inspections/{id}/sync-erpnext | Push to ERPNext               |
| GET    | /api/v1/approvals/                    | List approval requests        |
| POST   | /api/v1/approvals/                    | Submit for approval           |
| POST   | /api/v1/approvals/{id}/approve        | Approve                       |
| POST   | /api/v1/approvals/{id}/reject         | Reject                        |
| GET    | /api/v1/checklists/                   | List checklists               |
| POST   | /api/v1/checklists/                   | Create checklist              |
| GET    | /api/v1/audits/                       | Audit trail (filterable)      |
| GET    | /api/v1/rules/                        | List validation rules         |
| POST   | /api/v1/rules/                        | Create validation rule        |
| POST   | /api/v1/webhooks/erpnext              | ERPNext webhook receiver      |

---

## Avalonia Desktop Client

The desktop client runs **locally** and connects to quality-service.

```bash
cd quality-avalonia
dotnet restore
dotnet run --project QualityClient

# Or set custom API URL:
QUALITY_API_URL=http://localhost:8000 dotnet run --project QualityClient
```

**Requirements:** .NET 8 SDK

---

## Docker Services

| Service        | Image                      | Purpose                    |
|----------------|----------------------------|----------------------------|
| db             | mariadb:10.6               | ERPNext database           |
| redis-cache    | redis:7-alpine             | ERPNext cache              |
| redis-queue    | redis:7-alpine             | ERPNext job queue          |
| configurator   | frappe/erpnext:v15.45.0    | One-time ERPNext config    |
| create-site    | frappe/erpnext:v15.45.0    | One-time site creation     |
| backend        | frappe/erpnext:v15.45.0    | ERPNext app server         |
| frontend       | frappe/erpnext:v15.45.0    | ERPNext nginx proxy        |
| websocket      | frappe/erpnext:v15.45.0    | ERPNext socketio           |
| queue-short    | frappe/erpnext:v15.45.0    | ERPNext short queue worker |
| queue-long     | frappe/erpnext:v15.45.0    | ERPNext long queue worker  |
| scheduler      | frappe/erpnext:v15.45.0    | ERPNext scheduler          |
| quality-db     | postgres:15-alpine         | quality-service database   |
| quality-service| ./quality-service          | FastAPI microservice       |
| quality-ui     | ./quality-ui               | Next.js + shadCN web UI    |

---

## Scope Coverage

| Feature          | quality-service              | quality-ui page     |
|------------------|------------------------------|---------------------|
| Approvals        | `/api/v1/approvals/`         | /approvals          |
| Inspections      | `/api/v1/inspections/`       | /inspections        |
| Checklists       | `/api/v1/checklists/`        | /checklists         |
| Audit Trail      | `/api/v1/audits/`            | /audits             |
| Rule Validation  | `/api/v1/rules/` + validate  | /rules              |
| ERPNext Webhooks | `/api/v1/webhooks/erpnext`   | —                   |
