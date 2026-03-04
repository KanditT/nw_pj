# Project Milestone — Quality Inspection & Approval System

---

## Overview

A complete Quality Inspection & Approval system integrated with ERPNext, built as a microservice stack deployable with a single `docker compose up` command.

---

## Completed Milestones

### 1. Infrastructure & Deployment
- **Docker Compose stack** — 14 services orchestrated together
- **ERPNext v15** (MariaDB + Redis) — System of Record
- **PostgreSQL** — Dedicated database for quality-service audit trail
- **One-command startup** — `docker compose up -d` brings up the entire stack
- **Idempotent site creation** — ERPNext site setup skips safely on re-run
- **`.gitignore`** and **`.gitattributes`** — proper Git configuration for Windows + Docker

---

### 2. quality-service (FastAPI Microservice)
- **REST API** on port 8000 with full OpenAPI docs at `/docs`
- **6 modules implemented:**
  - Inspections — CRUD + validate + sync to ERPNext
  - Approvals — submit / approve / reject with ERPNext workflow sync
  - Checklists — reusable inspection checklists
  - Audit Trail — immutable append-only log in PostgreSQL
  - Rules — configurable validation rules with operators
  - Webhooks — receives ERPNext `on_submit` events
- **Rule Engine** — validates inspection readings against configured rules (between / gt / gte / lt / lte / eq)
- **Approval Engine** — manages approval lifecycle, syncs decisions to ERPNext workflow
- **Audit Logger** — logs every action immutably (actor, action, resource, old/new values)
- **ERPNext Client** — REST-only communication, no direct DB access
- **Fixed: SQLAlchemy async lazy loading** — all relationships use `selectinload` (inspections.items, checklists.items, approvals.decisions)
- **Fixed: Schema completeness** — `user_agent` field added to AuditLogRead

---

### 3. quality-ui (Next.js 14 + shadCN Web Dashboard)
- **Web UI** on port 3000
- **5 pages implemented:**
  - `/` Dashboard — stats overview + recent audit activity
  - `/inspections` — list, create, validate, sync, request approval
  - `/approvals` — pending queue, approve/reject with comments
  - `/checklists` — create and manage reusable checklists
  - `/audits` — filterable immutable audit trail
  - `/rules` — create and manage validation rules
- **API proxy** — all requests routed through Next.js rewrites to quality-service
- **Fixed: Docker build issues** — npm install, missing autoprefixer, next.config.mjs, public/ directory, removed Google Fonts

---

### 4. ERPNext Integration
- **Webhook** — ERPNext fires `on_submit` to quality-service automatically
- **Workflow** — "Quality Approval Workflow" with states: Draft → Pending → Approved / Rejected
- **Setup script** (`erpnext-setup/setup_quality.py`) — automates webhook + workflow creation via ERPNext REST API
  - Pre-creates Workflow State documents (Draft, Pending, Approved, Rejected)
  - Pre-creates Workflow Action Master documents (Submit for Approval, Approve, Reject)
  - Idempotent — safe to re-run

---

### 5. Avalonia Desktop Client
- **Cross-platform desktop app** (.NET 8 + Avalonia UI 11)
- Connects to quality-service REST API
- Views: Approvals, Inspections, Audit Trail
- Optional — not required if using the web UI

---

## Architecture Rules (Enforced Throughout)

| Rule | Status |
|------|--------|
| ERPNext is System of Record | Done |
| No direct ERPNext DB access | Done — REST API only |
| quality-service owns audit trail | Done — PostgreSQL |
| All communication via REST + Webhooks | Done |

---

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Quality UI | http://localhost:3000 | — |
| API Docs | http://localhost:8000/docs | — |
| ERPNext | http://localhost:8080 | admin / admin |

---

## Stack Summary

| Layer | Technology |
|-------|-----------|
| ERP | ERPNext v15.45.0 (Frappe) |
| Microservice | FastAPI + SQLAlchemy async + asyncpg |
| Database | PostgreSQL 15 (quality), MariaDB 10.6 (ERPNext) |
| Web UI | Next.js 14.2.29 + shadCN + Tailwind CSS |
| Desktop | Avalonia UI 11 + .NET 8 |
| Container | Docker Compose (14 services) |
