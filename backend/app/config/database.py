# ============================================
# database.py — Supabase connection
#
# This file creates TWO Supabase clients:
#
# 1. supabase_client — uses the publishable key
#    For normal operations. Respects Row Level Security.
#    This means users can only see their own data.
#
# 2. supabase_admin — uses the service role key
#    Has ADMIN access. Bypasses Row Level Security.
#    ONLY used for special operations like creating
#    a profile after signup.
#    NEVER expose this client to the frontend.
# ============================================

from supabase import create_client, Client
from app.config.settings import get_settings

settings = get_settings()


def get_supabase() -> Client:
    """
    Returns a normal Supabase client.
    Respects Row Level Security — users only see their own data.
    Use this for all normal database operations.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_key
    )


def get_supabase_with_token(token: str) -> Client:
    """
    Returns a Supabase client authenticated as the calling user.
    Passes the user's JWT so PostgREST runs queries under their identity,
    which lets Supabase RLS policies evaluate auth.uid() correctly.
    Use this for all user-specific queries in protected endpoints.
    """
    client = create_client(settings.supabase_url, settings.supabase_key)
    client.postgrest.auth(token)
    return client


def get_supabase_admin() -> Client:
    """
    Returns an admin Supabase client.
    Bypasses Row Level Security — can see ALL data.
    ONLY use this when absolutely necessary:
    - Creating a profile during signup
    - Fetching exchange rates (no user context)
    NEVER use this for user-specific queries.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_service_key
    )