from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import create_db_and_tables
from app.routers import inspections, approvals, checklists, audits, rules, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield


app = FastAPI(
    title="Quality Service",
    description="Quality Inspection and Approval Management — ERPNext Microservice",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inspections.router, prefix="/api/v1/inspections", tags=["Inspections"])
app.include_router(approvals.router,   prefix="/api/v1/approvals",   tags=["Approvals"])
app.include_router(checklists.router,  prefix="/api/v1/checklists",  tags=["Checklists"])
app.include_router(audits.router,      prefix="/api/v1/audits",       tags=["Audits"])
app.include_router(rules.router,       prefix="/api/v1/rules",        tags=["Rules"])
app.include_router(webhooks.router,    prefix="/api/v1/webhooks",     tags=["Webhooks"])


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "quality-service", "version": "1.0.0"}
