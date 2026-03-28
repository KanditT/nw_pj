from fastapi import HTTPException, APIRouter
import requests

from config.config import FRAPPE_URL, API_KEY, API_SECRET

HEADERS = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Content-Type": "application/json",
    "Host": "frontend"
}

router = APIRouter()


@router.get("")
def get_users():
    try:
        res = requests.get(
            f"{FRAPPE_URL}/api/resource/User",
            headers=HEADERS,
            params={"limit_page_length": 500, "fields": '["email"]'}
        )
        return res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
