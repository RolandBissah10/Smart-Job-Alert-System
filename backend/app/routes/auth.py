from fastapi import APIRouter, HTTPException
from app.models.user import UserLogin, RefreshRequest
from app.db.database import users_collection
from app.auth_utils import verify_password
from app.auth import create_access_token, create_refresh_token, verify_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
def login(credentials: UserLogin):
    user = users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

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
