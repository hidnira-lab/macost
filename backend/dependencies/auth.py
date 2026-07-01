import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer_scheme = HTTPBearer()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    """
    FastAPI dependency — validates Supabase JWT and returns the user UUID (sub claim).

    Algorithm: HS256 (Supabase uses symmetric HMAC-SHA256, NOT RS256)
    Audience: "authenticated" (Supabase always sets this claim on user tokens)

    Raises 401 on expired or invalid tokens.
    """
    token = credentials.credentials
    secret = os.environ["SUPABASE_JWT_SECRET"]

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
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
