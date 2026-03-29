from fastapi import HTTPException, APIRouter
import requests

from config.config import FRAPPE_URL, HEADERS

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
