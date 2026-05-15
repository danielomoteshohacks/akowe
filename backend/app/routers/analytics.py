# ============================================
# routers/analytics.py — Analytics endpoints
#
# This file exposes the P&L calculation
# as HTTP endpoints the frontend can call.
#
# GET /analytics/pnl     — full P&L report
# GET /analytics/summary — quick summary only
# ============================================

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.routers.auth import get_current_user
from app.services.analytics import calculate_pnl

router = APIRouter(prefix="/analytics", tags=["Analytics"])
security = HTTPBearer()


# ============================================
# ENDPOINT 1: GET /analytics/pnl
# Returns the full P&L report
# ============================================

@router.get("/pnl")
async def get_pnl(
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Returns the complete Profit & Loss report for the logged-in user.

    Includes:
    - Total income, expenses, net profit, profit margin
    - Month-by-month breakdown
    - Top expense categories
    - Top income sources
    - Business health status

    Optional query params:
    - from_date: filter from this date (YYYY-MM-DD)
    - to_date: filter to this date (YYYY-MM-DD)

    Example: GET /analytics/pnl?from_date=2025-01-01&to_date=2025-12-31
    """
    try:
        report = calculate_pnl(
            user_id=current_user["user_id"],
            from_date=from_date,
            to_date=to_date,
            token=credentials.credentials
        )
        return report

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not calculate P&L: {str(e)}"
        )


# ============================================
# ENDPOINT 2: GET /analytics/summary
# Returns just the 4 key numbers
# Used by the dashboard header cards
# ============================================

@router.get("/summary")
async def get_summary(
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Returns just the 4 key numbers for the dashboard.
    Faster than /pnl because it returns less data.

    Returns:
    - total_income
    - total_expense
    - net_profit
    - profit_margin
    - health_status
    - health_message
    """
    try:
        report = calculate_pnl(user_id=current_user["user_id"], token=credentials.credentials)
        return report["summary"]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not calculate summary: {str(e)}"
        )


# ============================================
# ENDPOINT 3: GET /analytics/categories
# Returns spending breakdown by category
# ============================================

@router.get("/categories")
async def get_categories_breakdown(
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Returns income and expense breakdown by category.
    Used for pie charts on the dashboard.
    """
    try:
        report = calculate_pnl(user_id=current_user["user_id"], token=credentials.credentials)
        return {
            "top_expenses": report["top_expenses"],
            "top_income_sources": report["top_income_sources"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not calculate categories: {str(e)}"
        )