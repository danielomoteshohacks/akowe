# ============================================
# transactions.py — Transaction endpoints
#
# This file handles everything related to
# a user's income and expense transactions:
#
# POST   /transactions         — add a transaction
# GET    /transactions         — list all transactions
# GET    /transactions/{id}    — get one transaction
# PUT    /transactions/{id}    — update a transaction
# DELETE /transactions/{id}    — delete a transaction
#
# ALL endpoints require a valid JWT token.
# Users can ONLY see and modify their OWN transactions.
# This is enforced by Row Level Security in Supabase.
# ============================================

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.routers.auth import get_current_user
from app.config.database import get_supabase_with_token, get_supabase_admin
from app.services.exchange_rate import get_today_rate

security = HTTPBearer()

router = APIRouter(prefix="/transactions", tags=["Transactions"])


# ============================================
# PYDANTIC MODELS
# ============================================

class TransactionCreate(BaseModel):
    """Data required to create a new transaction"""
    amount: int                    # Amount in KOBO (smallest unit)
                                   # e.g. ₦1,500 = 150000 kobo
                                   # This avoids floating point errors
    type: str                      # "income" or "expense"
    category_id: Optional[str] = None  # UUID of the category
    description: Optional[str] = None  # Optional note
    transaction_date: date = date.today()  # Defaults to today
    currency: str = "NGN"          # NGN or USD


class TransactionUpdate(BaseModel):
    """Fields that can be updated — all optional"""
    amount: Optional[int] = None
    type: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    transaction_date: Optional[date] = None


class TransactionResponse(BaseModel):
    """What we send back for each transaction"""
    id: str
    user_id: str
    amount: int
    amount_naira: float            # Converted from kobo for display
    type: str
    category_id: Optional[str]
    category_name: Optional[str]  # Joined from categories table
    description: Optional[str]
    transaction_date: str
    currency: str
    created_at: str


# ============================================
# HELPER: format transaction for response
# ============================================

def format_transaction(t: dict) -> dict:
    """
    Takes a raw transaction row from the database
    and formats it nicely for the frontend.
    Converts kobo to naira for display.
    """
    category_name = None
    # If categories were joined, extract the name
    if t.get("categories") and isinstance(t["categories"], dict):
        category_name = t["categories"].get("name")

    return {
        "id": t["id"],
        "user_id": t["user_id"],
        "amount": t["amount"],
        "amount_naira": t["amount"] / 100,  # Convert kobo to naira
        "type": t["type"],
        "category_id": t.get("category_id"),
        "category_name": category_name,
        "description": t.get("description"),
        "transaction_date": str(t["transaction_date"]),
        "currency": t.get("currency", "NGN"),
        "created_at": str(t["created_at"])
    }


# ============================================
# ENDPOINT 1: POST /transactions
# Create a new transaction
# ============================================

@router.post("/")
async def create_transaction(
    request: TransactionCreate,
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Creates a new income or expense transaction.
    Amount must be sent in KOBO (multiply naira by 100).
    Example: ₦5,000 = send 500000
    """
    supabase = get_supabase_with_token(credentials.credentials)

    # Validate type
    if request.type not in ["income", "expense"]:
        raise HTTPException(
            status_code=400,
            detail="Type must be 'income' or 'expense'"
        )

    # Validate amount is positive
    if request.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be greater than 0"
        )

    try:
        # Get today's exchange rate and calculate USD equivalent in cents
        try:
            rate = get_today_rate()
            naira_amount = request.amount / 100
            usd_amount = int((naira_amount / rate) * 100)
        except Exception:
            usd_amount = None

        # Insert the transaction
        # user_id comes from the verified JWT token — not from the request
        # This means users cannot create transactions for other users
        result = supabase.table("transactions").insert({
            "user_id": current_user["user_id"],
            "amount": request.amount,
            "type": request.type,
            "category_id": request.category_id,
            "description": request.description,
            "transaction_date": str(request.transaction_date),
            "currency": request.currency,
            "usd_amount": usd_amount
        }).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create transaction")

        return {
            "message": "Transaction created successfully",
            "transaction": format_transaction(result.data[0])
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================
# ENDPOINT 2: GET /transactions
# List all transactions for current user
# ============================================

@router.get("/")
async def get_transactions(
    type: Optional[str] = Query(None, description="Filter by 'income' or 'expense'"),
    from_date: Optional[date] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[date] = Query(None, description="End date YYYY-MM-DD"),
    limit: int = Query(50, description="Max number to return"),
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Returns all transactions for the logged-in user.
    Optional filters: type, date range, limit.
    Also joins the category name for each transaction.
    """
    supabase = get_supabase_with_token(credentials.credentials)

    try:
        # Start building the query
        # "categories(name)" means join the categories table
        # and include just the name field
        query = (
            supabase.table("transactions")
            .select("*, categories(name)")
            .eq("user_id", current_user["user_id"])
            .order("transaction_date", desc=True)
            .limit(limit)
        )

        # Apply optional filters
        if type:
            query = query.eq("type", type)
        if from_date:
            query = query.gte("transaction_date", str(from_date))
        if to_date:
            query = query.lte("transaction_date", str(to_date))

        result = query.execute()

        transactions = [format_transaction(t) for t in result.data]

        return {
            "transactions": transactions,
            "count": len(transactions)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================
# ENDPOINT 3: GET /transactions/{id}
# Get a single transaction
# ============================================

@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Returns a single transaction by ID."""
    supabase = get_supabase_with_token(credentials.credentials)

    try:
        result = (
            supabase.table("transactions")
            .select("*, categories(name)")
            .eq("id", transaction_id)
            .eq("user_id", current_user["user_id"])
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Transaction not found")

        return format_transaction(result.data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================
# ENDPOINT 4: PUT /transactions/{id}
# Update a transaction
# ============================================

@router.put("/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    request: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Updates a transaction.
    Only sends fields that were actually provided.
    Users can only update their own transactions (RLS enforces this).
    """
    supabase = get_supabase_with_token(credentials.credentials)

    # Build update dict with only the fields that were provided
    # exclude_unset=True means: only include fields the user actually sent
    update_data = request.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Convert date to string if present
    if "transaction_date" in update_data:
        update_data["transaction_date"] = str(update_data["transaction_date"])

    try:
        result = (
            supabase.table("transactions")
            .update(update_data)
            .eq("id", transaction_id)
            .eq("user_id", current_user["user_id"])
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Transaction not found")

        return {
            "message": "Transaction updated successfully",
            "transaction": format_transaction(result.data[0])
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================
# ENDPOINT 5: DELETE /transactions/{id}
# Delete a transaction
# ============================================

@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Deletes a transaction permanently.
    Users can only delete their own transactions (RLS enforces this).
    """
    supabase = get_supabase_with_token(credentials.credentials)

    try:
        result = (
            supabase.table("transactions")
            .delete()
            .eq("id", transaction_id)
            .eq("user_id", current_user["user_id"])
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Transaction not found")

        return {"message": "Transaction deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")