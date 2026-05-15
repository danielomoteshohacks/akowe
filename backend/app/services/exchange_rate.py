from datetime import date
import httpx
from app.config.database import get_supabase_admin
from app.config.settings import get_settings

settings = get_settings()


def fetch_and_store_rate() -> float | None:
    """Fetches today's USD→NGN rate from ExchangeRate-API and upserts into the DB."""
    try:
        url = f"https://v6.exchangerate-api.com/v6/{settings.exchange_rate_api_key}/pair/USD/NGN"
        response = httpx.get(url, timeout=10)
        data = response.json()

        if data.get("result") != "success":
            return None

        rate = float(data["conversion_rate"])
        today = str(date.today())

        get_supabase_admin().table("exchange_rates").upsert(
            {"date": today, "usd_to_ngn": rate, "source": "exchangerate-api"},
            on_conflict="date"
        ).execute()

        return rate
    except Exception:
        return None


def get_today_rate() -> float:
    """
    Returns today's USD→NGN rate.
    Resolution order: DB today → API fetch+store → DB latest → 1600.0 fallback.
    Never raises an exception.
    """
    today = str(date.today())
    supabase = get_supabase_admin()

    try:
        result = (
            supabase.table("exchange_rates")
            .select("usd_to_ngn")
            .eq("date", today)
            .limit(1)
            .execute()
        )
        if result.data:
            return float(result.data[0]["usd_to_ngn"])

        rate = fetch_and_store_rate()
        if rate is not None:
            return rate

        fallback = (
            supabase.table("exchange_rates")
            .select("usd_to_ngn")
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
        if fallback.data:
            return float(fallback.data[0]["usd_to_ngn"])

    except Exception:
        pass

    return 1600.0


def get_rate_for_date(date_str: str) -> float:
    """
    Returns the exchange rate for a specific date.
    Falls back to the nearest rate before the date, then earliest available.
    """
    supabase = get_supabase_admin()

    try:
        result = (
            supabase.table("exchange_rates")
            .select("usd_to_ngn")
            .eq("date", date_str)
            .limit(1)
            .execute()
        )
        if result.data:
            return float(result.data[0]["usd_to_ngn"])

        before = (
            supabase.table("exchange_rates")
            .select("usd_to_ngn")
            .lte("date", date_str)
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
        if before.data:
            return float(before.data[0]["usd_to_ngn"])

        earliest = (
            supabase.table("exchange_rates")
            .select("usd_to_ngn")
            .order("date", desc=False)
            .limit(1)
            .execute()
        )
        if earliest.data:
            return float(earliest.data[0]["usd_to_ngn"])

    except Exception:
        pass

    return 1600.0
