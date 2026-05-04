from fastapi import APIRouter, HTTPException, Header
from app.db.database import users_collection, jobs_collection, alerts_collection, saved_jobs_collection
from app.auth import verify_access_token
from app.services.job_filters import build_fresh_jobs_filter
from app.services.matcher import score_jobs_for_user, profile_has_match_criteria

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _build_match_profile(user: dict) -> dict:
    profile = dict(user.get("profile", {}))
    profile["match_source"] = user.get("match_source", "profile")
    profile["cv_keywords"] = user.get("cv_data", {}).get("keywords", [])
    return profile


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
    profile = _build_match_profile(user)
    profile_version = user.get("profile_version", 1)
    profile_complete = profile_has_match_criteria(profile)

    saved_count = saved_jobs_collection.count_documents({"user_email": email})
    alerts_count = 0
    total_jobs = 0
    if profile_complete:
        alerts_count = alerts_collection.count_documents({
            "user_id": user_id,
            "profile_version": profile_version,
        })
        fresh_jobs = list(jobs_collection.find(build_fresh_jobs_filter(7)).sort("created_at", -1).limit(500))
        if len(fresh_jobs) < 10:
            fresh_jobs = list(jobs_collection.find(build_fresh_jobs_filter(30)).sort("created_at", -1).limit(500))
        total_jobs = len(score_jobs_for_user(fresh_jobs, profile))

    recent_alerts_raw = []
    if profile_complete:
        recent_alerts_raw = list(
            alerts_collection.find({
                "user_id": user_id,
                "profile_version": profile_version,
            }).sort("sent_at", -1).limit(10)
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
        "profile": user.get("profile", {}),
        "profile_complete": profile_complete,
        "match_source": user.get("match_source", "profile"),
        "cv_uploaded": bool(user.get("cv_data", {}).get("text")),
        "stats": {
            "saved_jobs": saved_count,
            "alerts_sent": alerts_count,
            "total_jobs": total_jobs,
        },
        "profile_required": not profile_complete,
        "recent_alerts": recent_alerts,
    }
