from fastapi import APIRouter, HTTPException
from app.models.user import UserLogin
from app.db.database import users_collection
from app.auth_utils import verify_password
from app.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login")
def login(credentials: UserLogin):
    user = users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"email": credentials.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.get("username", ""),
    }
