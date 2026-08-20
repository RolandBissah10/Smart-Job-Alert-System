import logging
import secrets

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from app.models.user import UserLogin, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.db.database import users_collection
from app.auth_utils import verify_password, hash_password
from app.auth import create_access_token, create_refresh_token, create_reset_token, verify_access_token
from app.cache import cache
from app.config import FRONTEND_URL
from app.services.notifier import send_password_reset_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])

GENERIC_RESET_MESSAGE = "If an account exists for that email, a reset link has been sent."


@router.post("/login")
def login(credentials: UserLogin):
    user = users_collection.find_one({"email": credentials.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="No account found with this email address")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect password")

    access_token = create_access_token({"email": credentials.email})
    refresh_token = create_refresh_token({"email": credentials.email})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "username": user.get("username", ""),
    }


@router.post("/refresh")
def refresh(body: RefreshRequest):
    payload = verify_access_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    new_access_token = create_access_token({"email": payload["email"]})
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, background_tasks: BackgroundTasks, request: Request):
    ip = request.client.host if request.client else "unknown"
    ip_key = f"reset_ip:{ip}"
    ip_count = cache.get(ip_key) or 0
    if ip_count >= 10:
        return {"message": GENERIC_RESET_MESSAGE}
    cache.set(ip_key, ip_count + 1, ttl_seconds=600)

    email_key = f"reset_email:{body.email}"
    if cache.get(email_key):
        return {"message": GENERIC_RESET_MESSAGE}
    cache.set(email_key, True, ttl_seconds=60)

    user = users_collection.find_one({"email": body.email})
    if user and user.get("is_active", True):
        nonce = secrets.token_hex(16)
        users_collection.update_one({"_id": user["_id"]}, {"$set": {"reset_nonce": nonce}})
        token = create_reset_token(body.email, nonce)
        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        background_tasks.add_task(_send_reset_email_safely, body.email, reset_link)

    return {"message": GENERIC_RESET_MESSAGE}


def _send_reset_email_safely(email: str, reset_link: str):
    try:
        send_password_reset_email(email, reset_link)
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {e}")


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest):
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    payload = verify_access_token(body.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    updated = users_collection.find_one_and_update(
        {"email": payload.get("email"), "reset_nonce": payload.get("nonce")},
        {"$set": {"password": hash_password(body.new_password)}, "$unset": {"reset_nonce": ""}},
    )
    if not updated:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    return {"message": "Password reset successfully. You can now log in."}
