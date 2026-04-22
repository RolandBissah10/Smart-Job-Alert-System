from fastapi import APIRouter, HTTPException, Header
from app.models.user import UserSignup, UserUpdate, UserProfile
from app.db.database import users_collection
from app.auth_utils import hash_password
from app.auth import verify_access_token
from datetime import datetime

router = APIRouter(prefix="/users", tags=["Users"])


def _require_auth(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["email"]


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "username": user.get("username", ""),
        "email": user["email"],
        "profile": user.get("profile", {}),
        "is_active": user.get("is_active", True),
        "plan": user.get("plan", "free"),
        "created_at": user.get("created_at"),
    }


@router.post("/signup")
def signup(user: UserSignup):
    existing = users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_record = {
        "username": user.username.strip(),
        "email": user.email,
        "password": hash_password(user.password),
        "profile": {},
        "is_active": True,
        "plan": "free",
        "created_at": datetime.utcnow(),
    }
    users_collection.insert_one(user_record)
    return {"message": "User created successfully"}


@router.get("/me")
def get_me(authorization: str = Header(None)):
    email = _require_auth(authorization)
    user = users_collection.find_one({"email": email}, {"password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_user(user)


@router.put("/profile")
def update_profile(profile: UserProfile, authorization: str = Header(None)):
    email = _require_auth(authorization)
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    users_collection.update_one({"email": email}, {"$set": {"profile": profile.dict()}})
    return {"message": "Profile updated successfully"}


@router.get("/")
def list_users():
    users = [serialize_user(u) for u in users_collection.find({}, {"password": 0})]
    return users


@router.put("/{email}")
def update_user(email: str, update: UserUpdate):
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {k: v for k, v in update.dict().items() if v is not None}
    users_collection.update_one({"email": email}, {"$set": update_data})
    return {"message": "User updated successfully"}


@router.delete("/{email}")
def delete_user(email: str):
    result = users_collection.delete_one({"email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}
