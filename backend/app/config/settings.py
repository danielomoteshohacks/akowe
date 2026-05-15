# ============================================
# settings.py — reads all environment variables
# from the .env file and makes them available
# throughout the entire backend as typed values
# ============================================

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Absolute path to .env — resolved from this file's location so it works
# regardless of which directory uvicorn is started from.
_env_path = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_env_path),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Supabase ---
    supabase_url: str
    supabase_key: str           # anon/publishable key — respects RLS
    supabase_service_key: str   # service role key — bypasses RLS, backend-only
    supabase_jwt_secret: str    # used to verify Supabase-issued JWT tokens
    supabase_db_password: str

    # --- AI ---
    gemini_api_key: str

    # --- Exchange Rate ---
    exchange_rate_api_key: str

    # --- Error Monitoring ---
    sentry_dsn: str

    # --- App Config ---
    app_env: str = "development"
    app_name: str = "Akowe"
    secret_key: str


# lru_cache means this function only runs ONCE
# After the first call, it returns the cached result
# This is efficient — we don't re-read the .env file on every request
@lru_cache()
def get_settings():
    return Settings()


# Create one instance that the whole app imports
settings = get_settings()