from fastapi import APIRouter, HTTPException
from datetime import date
from app.services.exchange_rate import get_today_rate, fetch_and_store_rate

router = APIRouter(prefix="/exchange-rate", tags=["Exchange Rate"])


@router.get("/today")
async def today_rate():
    """Returns today's USD→NGN exchange rate."""
    try:
        rate = get_today_rate()
        return {"date": str(date.today()), "usd_to_ngn": rate}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh")
async def refresh_rate():
    """Fetches a fresh rate from ExchangeRate-API and stores it."""
    try:
        rate = fetch_and_store_rate()
        if rate is None:
            raise HTTPException(status_code=502, detail="Exchange rate API unavailable")
        return {"date": str(date.today()), "usd_to_ngn": rate, "refreshed": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
