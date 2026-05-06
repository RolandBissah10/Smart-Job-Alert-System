from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from app.models.user import UserSignup, UserUpdate, UserProfile, MatchSourceUpdate
from app.db.database import users_collection
from app.auth_utils import hash_password
from app.auth import verify_access_token
from app.services.cv_parser import extract_text_from_cv, extract_cv_keywords
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
    cv_data = user.get("cv_data", {})
    return {
        "id": str(user["_id"]),
        "username": user.get("username", ""),
        "email": user["email"],
        "profile": user.get("profile", {}),
        "profile_version": user.get("profile_version", 1),
        "match_source": user.get("match_source", "profile"),
        "cv_data": {
            "filename": cv_data.get("filename"),
            "uploaded_at": cv_data.get("uploaded_at"),
            "has_cv": bool(cv_data.get("text")),
            "keyword_count": len(cv_data.get("keywords", [])),
            "preview": (cv_data.get("text", "")[:300] if cv_data.get("text") else ""),
        },
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
        "profile_version": 1,
        "match_source": "profile",
        "cv_data": {},
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
    users_collection.update_one(
        {"email": email},
        {
            "$set": {
                "profile": profile.dict(),
                "profile_updated_at": datetime.utcnow(),
            },
            "$inc": {"profile_version": 1},
        },
    )
    return {"message": "Profile updated successfully"}


@router.post("/cv")
async def upload_cv(file: UploadFile = File(...), authorization: str = Header(None)):
    email = _require_auth(authorization)
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded CV is empty")

    try:
        text = extract_text_from_cv(file.filename or "cv", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CV: {e}")

    if not text:
        raise HTTPException(status_code=400, detail="Could not extract readable text from the CV")

    keywords = extract_cv_keywords(text)
    next_match_source = user.get("match_source", "profile")
    profile = user.get("profile", {})
    has_profile = bool(profile.get("skills") or profile.get("tech_stack") or profile.get("roles"))
    if next_match_source == "profile" and not has_profile:
        next_match_source = "cv"
    elif has_profile:
        next_match_source = "both"

    users_collection.update_one(
        {"email": email},
        {
            "$set": {
                "cv_data": {
                    "filename": file.filename,
                    "text": text,
                    "keywords": keywords,
                    "uploaded_at": datetime.utcnow(),
                },
                "match_source": next_match_source,
            },
            "$inc": {"profile_version": 1},
        },
    )
    return {
        "message": "CV uploaded successfully",
        "match_source": next_match_source,
        "cv_data": {
            "filename": file.filename,
            "has_cv": True,
            "keyword_count": len(keywords),
            "preview": text[:300],
        },
    }


@router.delete("/cv")
def delete_cv(authorization: str = Header(None)):
    email = _require_auth(authorization)
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = user.get("profile", {})
    has_profile = bool(profile.get("skills") or profile.get("tech_stack") or profile.get("roles"))
    next_match_source = "profile" if has_profile else "profile"

    users_collection.update_one(
        {"email": email},
        {
            "$set": {
                "cv_data": {},
                "match_source": next_match_source,
            },
            "$inc": {"profile_version": 1},
        },
    )
    return {"message": "CV removed successfully", "match_source": next_match_source}


@router.put("/match-source")
def update_match_source(body: MatchSourceUpdate, authorization: str = Header(None)):
    email = _require_auth(authorization)
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    match_source = (body.match_source or "").strip().lower()
    if match_source not in {"profile", "cv", "both"}:
        raise HTTPException(status_code=400, detail="match_source must be one of: profile, cv, both")

    profile = user.get("profile", {})
    has_profile = bool(profile.get("skills") or profile.get("tech_stack") or profile.get("roles"))
    has_cv = bool(user.get("cv_data", {}).get("text"))

    if match_source == "profile" and not has_profile:
        raise HTTPException(status_code=400, detail="Set up a profile first before using profile-only matching")
    if match_source == "cv" and not has_cv:
        raise HTTPException(status_code=400, detail="Upload a CV first before using CV-only matching")
    if match_source == "both" and not (has_profile and has_cv):
        raise HTTPException(status_code=400, detail="Both profile and CV are required for combined matching")

    users_collection.update_one(
        {"email": email},
        {
            "$set": {
                "match_source": match_source,
                "profile_updated_at": datetime.utcnow(),
            },
            "$inc": {"profile_version": 1},
        },
    )
    return {"message": "Match source updated successfully", "match_source": match_source}


@router.delete("/profile")
def reset_profile(authorization: str = Header(None)):
    email = _require_auth(authorization)
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    users_collection.update_one(
        {"email": email},
        {
            "$set": {
                "profile": {},
                "profile_updated_at": datetime.utcnow(),
            },
            "$inc": {"profile_version": 1},
        },
    )
    return {"message": "Profile reset successfully"}


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
