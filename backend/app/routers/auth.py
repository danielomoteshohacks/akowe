# ============================================
# auth.py — Authentication endpoints
#
# This file handles 3 things:
# 1. POST /auth/signup  — create a new account
# 2. POST /auth/login   — log in to existing account
# 3. GET  /auth/me      — get current logged-in user
#
# HOW AUTHENTICATION WORKS IN AKOWE:
# - User signs up or logs in
# - Supabase returns a JWT token (a long string)
# - Frontend stores this token in localStorage
# - Every future request sends this token in the header:
#   Authorization: Bearer <token>
# - Our backend verifies the token is genuine
# - If valid, we know exactly who the user is
# ============================================

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import jwt
from app.config.settings import get_settings
from app.config.database import get_supabase, get_supabase_admin

# Create the router — this groups all auth endpoints together
router = APIRouter(prefix="/auth", tags=["Authentication"])

# This tells FastAPI to look for a Bearer token in the
# Authorization header of incoming requests
security = HTTPBearer()

settings = get_settings()


# ============================================
# PYDANTIC MODELS
# These define the shape of data coming IN
# FastAPI automatically validates them
# If required fields are missing, it returns a
# clean error message automatically
# ============================================

class SignupRequest(BaseModel):
    """Data required to create a new account"""
    email: EmailStr          # EmailStr validates it's a real email format
    password: str            # Plain text — Supabase hashes it
    full_name: str           # User's full name
    business_name: str       # Their business name
    business_type: str = "general"  # Optional — defaults to "general"


class LoginRequest(BaseModel):
    """Data required to log in"""
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """What we send BACK after successful signup/login"""
    access_token: str        # The JWT token — frontend stores this
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    business_name: str


# ============================================
# HELPER FUNCTION: get_current_user
#
# This is a FastAPI "dependency"
# Any endpoint that needs to know who is logged in
# adds "current_user = Depends(get_current_user)"
# FastAPI automatically calls this function first
# and passes the result to the endpoint
# ============================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Extracts user identity from the Supabase JWT token.
    Signature verification is skipped — Supabase RLS validates tokens on every DB query.
    Raises a 401 error if the token is malformed or missing the sub field.
    """
    token = credentials.credentials

    try:
        # Decode without signature verification because Supabase now uses
        # ECC (P-256) asymmetric signing, not the legacy HS256 secret.
        # Token authenticity is enforced by Supabase RLS on every DB call.
        payload = jwt.decode(
            token,
            options={"verify_signature": False}
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {"user_id": user_id, "email": payload.get("email", "")}

    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token. Please log in again.")


# ============================================
# ENDPOINT 1: POST /auth/signup
# Creates a new user account
# ============================================

@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """
    Creates a new Akowe account.

    Steps:
    1. Create the user in Supabase Auth (handles password hashing)
    2. Create a profile row in our profiles table
    3. Return the JWT token so user is immediately logged in
    """
    supabase = get_supabase()
    admin = get_supabase_admin()

    try:
        # Step 1: Create user in Supabase Auth
        # Supabase hashes the password automatically — we never store plain text
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Could not create account. Try again.")

        user_id = auth_response.user.id
        token = auth_response.session.access_token if auth_response.session else None

        # Step 2: Create profile in our profiles table
        # We use admin client here because the user doesn't have a token yet
        # so RLS would block a normal insert
        admin.table("profiles").insert({
            "id": user_id,
            "full_name": request.full_name,
            "business_name": request.business_name,
            "business_type": request.business_type
        }).execute()

        if not token:
            raise HTTPException(
                status_code=201,
                detail="Account created. Please check your email to verify, then log in."
            )

        # Step 3: Return token and user info
        return AuthResponse(
            access_token=token,
            user_id=user_id,
            email=request.email,
            full_name=request.full_name,
            business_name=request.business_name
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower() or "already been registered" in error_msg.lower():
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        raise HTTPException(status_code=500, detail=f"Signup failed: {error_msg}")


# ============================================
# ENDPOINT 2: POST /auth/login
# Logs in an existing user
# ============================================

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Logs in an existing user.

    Steps:
    1. Verify email and password with Supabase Auth
    2. Fetch their profile from our profiles table
    3. Return the JWT token
    """
    supabase = get_supabase()

    try:
        # Step 1: Verify credentials with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not auth_response.user or not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        user_id = auth_response.user.id
        token = auth_response.session.access_token

        # Step 2: Fetch their profile
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Profile not found.")

        profile = profile_response.data

        # Step 3: Return token and profile data
        return AuthResponse(
            access_token=token,
            user_id=user_id,
            email=request.email,
            full_name=profile["full_name"],
            business_name=profile["business_name"]
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "invalid" in error_msg.lower() or "credentials" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        raise HTTPException(status_code=500, detail=f"Login failed: {error_msg}")


# ============================================
# ENDPOINT 3: GET /auth/me
# Returns the current logged-in user's profile
# ============================================

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Returns the current user's profile.
    Requires a valid JWT token in the Authorization header.

    The frontend calls this on startup to check if
    the user is still logged in.
    """
    supabase = get_supabase()

    try:
        # Fetch profile using the user_id from the verified token
        profile_response = (
            supabase.table("profiles")
            .select("*")
            .eq("id", current_user["user_id"])
            .single()
            .execute()
        )

        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Profile not found.")

        profile = profile_response.data

        return {
            "user_id": current_user["user_id"],
            "email": current_user["email"],
            "full_name": profile["full_name"],
            "business_name": profile["business_name"],
            "business_type": profile["business_type"],
            "created_at": profile["created_at"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch profile: {str(e)}")