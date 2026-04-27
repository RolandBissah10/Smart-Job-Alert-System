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

    user_id = user["_id"]
    profile = user.get("profile", {})
    profile_complete = bool(profile.get("skills") or profile.get("tech_stack") or profile.get("roles"))

    saved_count = saved_jobs_collection.count_documents({"user_email": email})
    alerts_count = alerts_collection.count_documents({"user_id": user_id})
    total_jobs = jobs_collection.count_documents({})

    recent_alerts_raw = list(
        alerts_collection.find({"user_id": user_id}).sort("sent_at", -1).limit(10)
    )
    recent_alerts = []
    for a in recent_alerts_raw:
        recent_alerts.append({
            "_id": str(a["_id"]),
            "job_title": a.get("job_title", "Job alert sent"),
            "job_company": a.get("job_company", ""),
            "job_url": a.get("job_url", ""),
            "sent_at": a.get("sent_at"),
        })

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
