# Quality Inspection System

ระบบจัดการ Quality Inspection สำหรับกระบวนการรับสินค้า โดยเชื่อมต่อกับ ERPNext/Frappe เป็น backend หลัก

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TailwindCSS, shadcn/ui |
| Backend | FastAPI (Python), Uvicorn |
| ERP | ERPNext / Frappe (REST API) |
| Container | Docker, Docker Compose |

---

## System Flow
![Alt text](/images/flow.png "flow")

---

## Doctypes

| DocType | ประเภท | คำอธิบาย |
|---|---|---|
| Item | ERPNext built-in | Master data สินค้า |
| Supplier | ERPNext built-in | Master data ผู้จัดจำหน่าย |
| Purchase Receipt | ERPNext built-in | ใบรับสินค้า |
| Quality Inspection Parameter | ERPNext built-in | ชื่อพารามิเตอร์ที่ใช้ตรวจสอบ |
| Quality Inspection Template | ERPNext built-in | ชุดพารามิเตอร์ + min/max |
| Quality Inspection | ERPNext built-in | ผลการตรวจสอบ |
| Approval Request | **Custom** | คำขออนุมัติ สร้างอัตโนมัติเมื่อสร้าง QI |
| Audit Log | **Custom** | บันทึก action ทุกตัวในระบบ |

---

## Project Structure

```
project/
├── backend/                  # FastAPI
│   ├── main.py               # App entry point + DocType setup on startup
│   ├── config/
│   │   └── config.py         # FRAPPE_URL, API credentials
│   └── routes/
│       ├── item.py
│       ├── supplier.py
│       ├── purchase_receipt.py
│       ├── quality_inspection_parameter.py
│       ├── quality_inspection_template.py
│       ├── quality_inspection.py
│       ├── approve.py
│       ├── audit_log.py
│       └── user.py
├── frontend/                 # Next.js
│   ├── app/
│   │   ├── item/
│   │   ├── supplier/
│   │   ├── purchase-receipt/
│   │   ├── quality-inspection-parameter/
│   │   ├── quality-inspection-template/
│   │   ├── quality-inspection/
│   │   ├── approvals/
│   │   └── audit-log/
│   ├── components/
│   ├── config/
│   │   └── navigation-menu.ts
│   └── types/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- ERPNext/Frappe รันอยู่บน network `frappe_docker_frappe_network`

### 1. Clone & Setup Environment

```bash
git clone <repo-url>
cd project
cp .env.example .env
```

แก้ไข `.env`:

```env
FRAPPE_URL=http://localhost:8080
API_KEY=<your-api-key>
API_SECRET=<your-api-secret>

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/
```

> **หา API Key/Secret:** Frappe Admin → User → (เลือก user) → API Access → Generate Keys

### 2. Run with Docker

```bash
docker-compose up -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### 3. Run without Docker (Development)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Mock Data

เรียก endpoint เพื่อสร้างข้อมูลตัวอย่างได้ที่ `http://localhost:8000/docs`

| Endpoint | คำอธิบาย |
|---|---|
| `POST /items/mock-up-data` | สร้าง Item ตัวอย่าง 10 รายการ |
| `POST /suppliers/mock-up-data` | สร้าง Supplier ตัวอย่าง 10 รายการ |
| `POST /purchase-receipts/mock-up-data` | สร้าง Purchase Receipt ตัวอย่าง 10 รายการ |
| `POST /quality-inspection-parameters/mock-up-data` | สร้าง QI Parameter ตัวอย่าง |
| `POST /quality-inspection-templates/mock-up-data` | สร้าง QI Template ตัวอย่าง |

> **ลำดับการสร้าง:** Items → Suppliers → Purchase Receipts → QI Parameters → QI Templates

---

## Custom DocType Setup

`Approval Request` และ `Audit Log` จะถูกสร้างอัตโนมัติใน Frappe เมื่อ backend เริ่มทำงาน ไม่ต้องสร้างด้วยตนเอง

---

## API Endpoints

| Method | Path | คำอธิบาย |
|---|---|---|
| GET/POST/PUT/DELETE | `/items` | จัดการ Item |
| GET/POST/PUT/DELETE | `/suppliers` | จัดการ Supplier |
| GET/POST/PUT/DELETE | `/purchase-receipts` | จัดการ Purchase Receipt |
| GET/POST/PUT/DELETE | `/quality-inspection-parameters` | จัดการ QI Parameter |
| GET/POST/PUT/DELETE | `/quality-inspection-templates` | จัดการ QI Template |
| GET/POST/PUT/DELETE | `/quality-inspections` | จัดการ Quality Inspection |
| POST | `/quality-inspections/{name}/cancel` | ยกเลิก QI |
| GET | `/approvals` | รายการรออนุมัติ |
| GET | `/approvals/history` | ประวัติการอนุมัติ |
| POST | `/approvals/{name}` | Approve / Reject |
| POST | `/approvals/{name}/cancel` | ยกเลิกการอนุมัติ |
| GET | `/audit-logs` | ดู Audit Log |
| GET | `/approvals/stats` | สถิติสำหรับ Dashboard |
