from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())

FRAPPE_URL = os.getenv("FRAPPE_URL")
API_KEY = os.getenv("API_KEY")
API_SECRET = os.getenv("API_SECRET")
ERPNEXT_USER = os.getenv("ERPNEXT_USER")
ERPNEXT_PASSWORD = os.getenv("ERPNEXT_PASSWORD")