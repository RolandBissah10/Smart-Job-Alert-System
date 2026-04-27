from fastapi import APIRouter, HTTPException, Header, Query
from app.services.scraper import fetch_jobs, save_jobs
from app.services.matcher import match_jobs_to_active_users, score_jobs_for_user
from app.services.notifier import send_email
from app.db.database import alerts_collection, users_collection, jobs_collection
from app.auth import verify_access_token
from datetime import datetime, timedelta

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def _require_auth(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["email"]


@router.get("/scrape")
def scrape_jobs():
    jobs = fetch_jobs()
    new_jobs = save_jobs(jobs)
    return {"count": len(new_jobs), "new_jobs": new_jobs}


@router.get("/feed")
def get_job_feed(
    authorization: str = Header(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(6, ge=1, le=50),
):
    email = _require_auth(authorization)
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = user.get("profile", {})
    if not profile.get("skills") and not profile.get("tech_stack") and not profile.get("roles"):
        return {"jobs": [], "total": 0, "page": page, "page_size": page_size, "profile_required": True}

    # Show only jobs confirmed active in the last 7 days (last_seen_at refreshed each scrape)
    # Fall back to last 30 days for sparse DBs or before first pipeline run with new tracking
    cutoff = datetime.utcnow() - timedelta(days=7)
    fresh_filter = {"$or": [
        {"last_seen_at": {"$gte": cutoff}},
        {"last_seen_at": {"$exists": False}, "created_at": {"$gte": cutoff}},
    ]}
    jobs = list(jobs_collection.find(fresh_filter).sort("created_at", -1).limit(500))
    if len(jobs) < 10:
        cutoff = datetime.utcnow() - timedelta(days=30)
        fresh_filter = {"$or": [
            {"last_seen_at": {"$gte": cutoff}},
            {"last_seen_at": {"$exists": False}, "created_at": {"$gte": cutoff}},
        ]}
        jobs = list(jobs_collection.find(fresh_filter).sort("created_at", -1).limit(500))

    # Score jobs; only return those with a positive match score (no random fallback)
    all_scored = [s for s in score_jobs_for_user(jobs, profile) if s["score"] > 0]

    total = len(all_scored)
    skip = (page - 1) * page_size
    paginated = all_scored[skip: skip + page_size]

    return {"jobs": paginated, "total": total, "page": page, "page_size": page_size, "profile_required": False}


@router.post("/run-pipeline")
def run_pipeline():
    jobs = fetch_jobs()
    new_jobs = save_jobs(jobs)
    matches = match_jobs_to_active_users(new_jobs)
    delivered = []
    for match in matches:
        user = match["user"]
        job = match["job"]
        if not alerts_collection.find_one({"user_id": user["_id"], "job_id": job["_id"]}):
            send_email(user["email"], [job])
            alerts_collection.insert_one({
                "user_id": user["_id"],
                "user_email": user["email"],
                "job_id": job["_id"],
                "job_title": job.get("title"),
                "job_company": job.get("company"),
                "job_url": job.get("url"),
                "sent_at": datetime.utcnow(),
            })
            delivered.append({"email": user["email"], "job_url": job.get("url")})
    return {"delivered": delivered, "matches": len(matches)}
