import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer_scheme = HTTPBearer()
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """
    Cached at module level — PyJWKClient itself caches fetched keys, so this
    avoids re-fetching Supabase's JWKS endpoint on every request.
    """
    global _jwks_client
    if _jwks_client is None:
        supabase_url = os.environ["SUPABASE_URL"]
        _jwks_client = PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")
    return _jwks_client


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """
    FastAPI dependency — validates Supabase JWT and returns the user UUID (sub claim).

    Verifies against Supabase's JWKS endpoint (public signing keys) rather than a
    manually-configured shared secret. Supabase's newer "JWT Signing Keys" projects
    rotate between algorithms (ES256, HS256, etc.) without exposing a copyable
    secret for HS256, so JWKS is the only verification path that works regardless
    of which key type is currently active.

    Audience: "authenticated" (Supabase always sets this claim on user tokens)

    Raises 401 on expired or invalid tokens.
    """
    token = credentials.credentials

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "HS256", "EdDSA"],
            audience="authenticated",  # MUST verify audience — Pitfall 6
        )
        return str(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "TOKEN_EXPIRED", "message": "Token sudah kadaluarsa"}},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Token tidak valid"}},
        )
