from fastapi import APIRouter, HTTPException, Header
from app.db.database import users_collection, jobs_collection, alerts_collection, saved_jobs_collection
from app.auth import verify_access_token

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _require_auth(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["email"]


@router.get("/")
def get_dashboard(authorization: str = Header(None)):
    email = _require_auth(authorization)
    user = users_collection.find_one({"email": email}, {"password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = user.get("profile", {})
    profile_complete = bool(profile.get("tech_stack") or profile.get("roles"))

    saved_count = saved_jobs_collection.count_documents({"user_email": email})
    alerts_count = alerts_collection.count_documents({"user_email": email})
    total_jobs = jobs_collection.count_documents({})

    recent_alerts = list(
        alerts_collection.find({"user_email": email}).sort("sent_at", -1).limit(5)
    )
    for a in recent_alerts:
        a["_id"] = str(a["_id"])
        if "job_id" in a:
            a["job_id"] = str(a["job_id"])
        if "user_id" in a:
            a["user_id"] = str(a["user_id"])

    return {
        "email": email,
        "profile": profile,
        "profile_complete": profile_complete,
        "stats": {
            "saved_jobs": saved_count,
            "alerts_sent": alerts_count,
            "total_jobs": total_jobs,
        },
        "recent_alerts": recent_alerts,
    }
