from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_db_password: str
    gemini_api_key: str
    exchange_rate_api_key: str
    sentry_dsn: str
    app_env: str = "development"
    app_name: str = "Akowe"
    secret_key: str

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()