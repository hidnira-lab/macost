from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.core.supabase import get_supabase_admin, get_supabase_anon

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    nama: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    """
    POST /api/auth/register
    Creates a new user via Supabase Admin API and returns an access_token.

    Response shape matches API_CONTRACT.md §1.
    """
    admin = get_supabase_admin()

    # Create user via admin API (email_confirm=True skips email confirmation for MVP)
    try:
        create_response = admin.auth.admin.create_user(
            {
                "email": body.email,
                "password": body.password,
                "email_confirm": True,
                "user_metadata": {"nama": body.nama},
            }
        )
    except Exception as exc:
        exc_str = str(exc).lower()
        if "already registered" in exc_str or "user already registered" in exc_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "EMAIL_TAKEN", "message": "Email sudah digunakan"}},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "REGISTRATION_FAILED", "message": str(exc)}},
        )

    user = create_response.user
    id_pengguna = str(user.id)

    # Admin API does not issue tokens — use anon client to sign in and get access_token
    anon = get_supabase_anon()
    try:
        sign_in_response = anon.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "TOKEN_ISSUANCE_FAILED", "message": "User created but could not sign in"}},
        )

    access_token = sign_in_response.session.access_token

    return {
        "id_pengguna": id_pengguna,
        "nama": body.nama,
        "email": body.email,
        "access_token": access_token,
    }


@router.post("/login", status_code=status.HTTP_200_OK)
def login(body: LoginRequest):
    """
    POST /api/auth/login
    Signs in via Supabase password auth and returns access_token + user id.

    Response shape matches API_CONTRACT.md §1.
    Returns 401 on invalid credentials, 423 on account lock.
    """
    anon = get_supabase_anon()

    try:
        response = anon.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        exc_str = str(exc).lower()

        # Supabase returns "Email rate limit exceeded" or "too many requests" when locked
        if "rate limit" in exc_str or "too many" in exc_str or "locked" in exc_str:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "error": {
                        "code": "ACCOUNT_LOCKED",
                        "message": "Terlalu banyak percobaan gagal. Coba lagi dalam 30 menit.",
                    }
                },
            )

        # Invalid credentials
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Email atau password salah",
                }
            },
        )

    return {
        "access_token": response.session.access_token,
        "id_pengguna": str(response.user.id),
    }
