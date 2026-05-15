# ============================================
# analytics.py — P&L Calculation Service
#
# This file does the financial math.
# It takes a user's raw transactions and
# calculates meaningful business metrics:
#
# - Total income
# - Total expenses
# - Net profit (income - expenses)
# - Profit margin (profit / income * 100)
# - Month-by-month breakdown
# - Top expense categories
# - Top income sources
#
# This is a SERVICE — it contains pure logic.
# It does not handle HTTP requests directly.
# The analytics router will call these functions.
# ============================================

from app.config.database import get_supabase, get_supabase_with_token
from datetime import date, datetime
from collections import defaultdict


def calculate_pnl(user_id: str, from_date: str = None, to_date: str = None, token: str = None) -> dict:
    """
    Calculates the full Profit & Loss report for a user.

    Parameters:
    - user_id: the user's UUID from their JWT token
    - from_date: optional start date (YYYY-MM-DD)
    - to_date: optional end date (YYYY-MM-DD)

    Returns a dictionary with all financial metrics.
    """
    supabase = get_supabase_with_token(token) if token else get_supabase()

    # ----------------------------------------
    # Step 1: Fetch all transactions for user
    # Join categories to get category names
    # ----------------------------------------
    query = (
        supabase.table("transactions")
        .select("*, categories(name, type)")
        .eq("user_id", user_id)
        .order("transaction_date", desc=False)  # Oldest first for monthly grouping
    )

    # Apply date filters if provided
    if from_date:
        query = query.gte("transaction_date", from_date)
    if to_date:
        query = query.lte("transaction_date", to_date)

    result = query.execute()
    transactions = result.data or []

    # ----------------------------------------
    # Step 2: Calculate totals
    # Amounts are stored in kobo — convert to naira
    # USD amounts are stored in cents — convert to dollars
    # ----------------------------------------
    total_income_kobo = 0
    total_expense_kobo = 0
    total_income_usd_cents = 0
    total_expense_usd_cents = 0

    # Track spending by category
    income_by_category = defaultdict(int)   # category_name: total_kobo
    expense_by_category = defaultdict(int)  # category_name: total_kobo

    # Track by month — format: "2025-01"
    monthly_data = defaultdict(lambda: {"income": 0, "expense": 0})

    for t in transactions:
        amount = t["amount"]  # In kobo
        tx_type = t["type"]
        tx_date = t["transaction_date"]  # "2025-01-15"
        usd_cents = t.get("usd_amount") or 0

        # Get month key from date string
        month_key = tx_date[:7]  # "2025-01"

        # Get category name
        category_name = "Uncategorized"
        if t.get("categories") and isinstance(t["categories"], dict):
            category_name = t["categories"].get("name", "Uncategorized")

        if tx_type == "income":
            total_income_kobo += amount
            total_income_usd_cents += usd_cents
            income_by_category[category_name] += amount
            monthly_data[month_key]["income"] += amount

        elif tx_type == "expense":
            total_expense_kobo += amount
            total_expense_usd_cents += usd_cents
            expense_by_category[category_name] += amount
            monthly_data[month_key]["expense"] += amount

    # ----------------------------------------
    # Step 3: Convert to naira/dollars and calculate metrics
    # ----------------------------------------
    total_income = total_income_kobo / 100
    total_expense = total_expense_kobo / 100
    net_profit = total_income - total_expense

    total_income_usd = total_income_usd_cents / 100
    total_expense_usd = total_expense_usd_cents / 100
    net_profit_usd = total_income_usd - total_expense_usd

    # Profit margin = (net profit / total income) * 100
    # Handle division by zero if no income yet
    profit_margin = 0.0
    if total_income > 0:
        profit_margin = round((net_profit / total_income) * 100, 2)

    # ----------------------------------------
    # Step 4: Build monthly breakdown
    # Sort by month, convert to naira
    # ----------------------------------------
    monthly_breakdown = []
    for month, data in sorted(monthly_data.items()):
        income = data["income"] / 100
        expense = data["expense"] / 100
        profit = income - expense

        monthly_breakdown.append({
            "month": month,
            "income": round(income, 2),
            "expense": round(expense, 2),
            "profit": round(profit, 2)
        })

    # ----------------------------------------
    # Step 5: Top categories (sorted by amount)
    # ----------------------------------------

    # Top 5 expense categories
    top_expenses = sorted(
        [
            {
                "category": name,
                "amount": round(amount / 100, 2),
                "percentage": round((amount / total_expense_kobo * 100), 2)
                if total_expense_kobo > 0 else 0
            }
            for name, amount in expense_by_category.items()
        ],
        key=lambda x: x["amount"],
        reverse=True
    )[:5]

    # Top 5 income sources
    top_income = sorted(
        [
            {
                "category": name,
                "amount": round(amount / 100, 2),
                "percentage": round((amount / total_income_kobo * 100), 2)
                if total_income_kobo > 0 else 0
            }
            for name, amount in income_by_category.items()
        ],
        key=lambda x: x["amount"],
        reverse=True
    )[:5]

    # ----------------------------------------
    # Step 6: Business health assessment
    # Simple rules to give the user context
    # ----------------------------------------
    health_status = "healthy"
    health_message = "Your business is profitable."

    if total_income == 0:
        health_status = "no_data"
        health_message = "No income recorded yet. Add your first transaction."
    elif net_profit < 0:
        health_status = "loss"
        health_message = f"You are spending more than you earn. Loss of ₦{abs(net_profit):,.2f}."
    elif profit_margin < 10:
        health_status = "warning"
        health_message = f"Profit margin is low at {profit_margin}%. Consider reducing expenses."
    elif profit_margin >= 30:
        health_status = "excellent"
        health_message = f"Excellent! {profit_margin}% profit margin."

    # ----------------------------------------
    # Step 7: Return the complete P&L report
    # ----------------------------------------
    return {
        "summary": {
            "total_income": round(total_income, 2),
            "total_expense": round(total_expense, 2),
            "net_profit": round(net_profit, 2),
            "profit_margin": profit_margin,
            "transaction_count": len(transactions),
            "health_status": health_status,
            "health_message": health_message,
            "total_income_usd": round(total_income_usd, 2),
            "total_expense_usd": round(total_expense_usd, 2),
            "net_profit_usd": round(net_profit_usd, 2),
        },
        "monthly_breakdown": monthly_breakdown,
        "top_expenses": top_expenses,
        "top_income_sources": top_income,
        "period": {
            "from": from_date or (transactions[0]["transaction_date"] if transactions else None),
            "to": to_date or str(date.today())
        }
    }