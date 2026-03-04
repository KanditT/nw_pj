import json
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://quality:quality123@quality-db:5432/quality_db"
    erpnext_url: str = "http://frontend:8080"
    erpnext_api_key: str = ""
    erpnext_api_secret: str = ""
    erpnext_site: str = "quality.localhost"
    secret_key: str = "change-me-in-production"
    webhook_secret: str = "webhook-secret"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8080"]

    model_config = {"env_file": ".env", "case_sensitive": False}

    def model_post_init(self, __context):
        # allow CORS_ORIGINS as JSON string from env
        pass

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if isinstance(obj, dict) and "cors_origins" in obj:
            v = obj["cors_origins"]
            if isinstance(v, str):
                try:
                    obj["cors_origins"] = json.loads(v)
                except Exception:
                    obj["cors_origins"] = [v]
        return super().model_validate(obj, *args, **kwargs)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
