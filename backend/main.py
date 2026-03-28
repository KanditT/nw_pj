from fastapi import FastAPI, HTTPException
import requests
from routes import item, item_group, supplier, purchase_receipt, quality_inspection_parameter, quality_inspection_template, quality_inspection, user
from fastapi.middleware.cors import CORSMiddleware
import json

from config.config import FRAPPE_URL, API_KEY, API_SECRET

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # หรือ ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)   
    
app.include_router(item.router, prefix="/items", tags=["items"])
app.include_router(item_group.router, prefix="/item-groups", tags=["item-groups"])
app.include_router(supplier.router, prefix="/suppliers", tags=["suppliers"])
app.include_router(purchase_receipt.router, prefix="/purchase-receipts", tags=["purchase-receipts"])
app.include_router(quality_inspection_parameter.router, prefix="/quality-inspection-parameters", tags=["quality-inspection-parameters"])
app.include_router(quality_inspection_template.router, prefix="/quality-inspection-templates", tags=["quality-inspection-templates"])
app.include_router(quality_inspection.router, prefix="/quality-inspections", tags=["quality-inspections"])
app.include_router(user.router, prefix="/users", tags=["users"])