from fastapi import APIRouter, HTTPException
from app.models.user import UserSignup, UserUpdate
from app.db.database import users_collection
from app.auth_utils import hash_password
from datetime import datetime

router = APIRouter(prefix="/users", tags=["Users"])


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "keywords": user.get("keywords", []),
        "location": user.get("location", "remote"),
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
        "email": user.email,
        "password": hash_password(user.password),
        "keywords": [kw.strip().lower() for kw in user.keywords if kw.strip()],
        "location": user.location,
        "is_active": True,
        "plan": "free",
        "created_at": datetime.utcnow(),
    }
    users_collection.insert_one(user_record)
    return {"message": "User created successfully"}


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
    if "keywords" in update_data:
        update_data["keywords"] = [kw.strip().lower() for kw in update_data["keywords"]]

    users_collection.update_one({"email": email}, {"$set": update_data})
    return {"message": "User updated successfully"}


@router.delete("/{email}")
def delete_user(email: str):
    result = users_collection.delete_one({"email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}
