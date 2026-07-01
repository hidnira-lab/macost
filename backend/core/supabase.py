import os
from supabase import create_client, Client

# Cached at module level to avoid recreating per request
_supabase_admin: Client | None = None
_supabase_anon: Client | None = None


def get_supabase_admin() -> Client:
    """
    Returns a Supabase client authenticated with SERVICE_ROLE_KEY.
    Service role bypasses RLS — FastAPI is the trusted layer enforcing auth.
    """
    global _supabase_admin
    if _supabase_admin is None:
        url = os.environ["SUPABASE_URL"]
        service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        _supabase_admin = create_client(url, service_key)
    return _supabase_admin


def get_supabase_anon() -> Client:
    """
    Returns a Supabase client authenticated with ANON_KEY.
    Used for sign_in_with_password (token issuance requires anon client).
    """
    global _supabase_anon
    if _supabase_anon is None:
        url = os.environ["SUPABASE_URL"]
        anon_key = os.environ["SUPABASE_ANON_KEY"]
        _supabase_anon = create_client(url, anon_key)
    return _supabase_anon
