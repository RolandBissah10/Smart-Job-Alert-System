from fastapi import APIRouter, HTTPException, Header, Query
from app.services.scraper import fetch_jobs, save_jobs
from app.services.matcher import get_matching_jobs_for_profile, score_jobs_for_user, profile_has_match_criteria
from app.services.notifier import send_email
from app.services.job_filters import build_fresh_jobs_filter
from app.db.database import alerts_collection, users_collection, jobs_collection
from app.auth import verify_access_token
from app.cache import cache
from datetime import datetime

router = APIRouter(prefix="/jobs", tags=["Jobs"])


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

    profile = _build_match_profile(user)
    if not profile_has_match_criteria(profile):
        return {"jobs": [], "total": 0, "page": page, "page_size": page_size, "profile_required": True}

    profile_version = user.get("profile_version", 1)

    # Cache key for job feed
    cache_key = f"job_feed:{profile_version}:{page}:{page_size}"

    # Try to get cached data
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    # Cache fresh jobs for 10 minutes
    jobs_cache_key = f"fresh_jobs:{profile_version}"
    jobs = cache.get(jobs_cache_key)
    if jobs is None:
        # Show only jobs confirmed active in the last 7 days (last_seen_at refreshed each scrape)
        # Fall back to last 30 days for sparse DBs or before first pipeline run with new tracking
        fresh_filter = build_fresh_jobs_filter(7)
        jobs = list(jobs_collection.find(fresh_filter).sort("created_at", -1).limit(500))
        if len(jobs) < 10:
            fresh_filter = build_fresh_jobs_filter(30)
            jobs = list(jobs_collection.find(fresh_filter).sort("created_at", -1).limit(500))
        cache.set(jobs_cache_key, jobs, 600)  # 10 minutes

    # Score jobs; only return those with a positive match score (no random fallback)
    all_scored = score_jobs_for_user(jobs, profile)

    total = len(all_scored)
    skip = (page - 1) * page_size
    paginated = all_scored[skip: skip + page_size]

    result = {"jobs": paginated, "total": total, "page": page, "page_size": page_size, "profile_required": False}

    # Cache the result for 5 minutes
    cache.set(cache_key, result, 300)

    return result


@router.post("/run-pipeline")
def run_pipeline():
    jobs = fetch_jobs()
    new_jobs = save_jobs(jobs)
    active_users = list(users_collection.find({"is_active": True}))

    delivered = []
    for user in active_users:
        profile = _build_match_profile(user)
        profile_version = user.get("profile_version", 1)
        match_source = user.get("match_source", "profile")
        if not profile_has_match_criteria(profile):
            continue

        sent_ids = [
            a["job_id"]
            for a in alerts_collection.find({
                "user_id": user["_id"],
                "profile_version": profile_version,
            }, {"job_id": 1})
        ]

        fresh_filter = build_fresh_jobs_filter(7)
        unalerted = list(
            jobs_collection.find({
                **fresh_filter,
                "_id": {"$nin": sent_ids},
            }).limit(500)
        )
        if len(unalerted) < 10:
            fallback_filter = build_fresh_jobs_filter(30)
            unalerted = list(
                jobs_collection.find({
                    **fallback_filter,
                    "_id": {"$nin": sent_ids},
                }).limit(500)
            )

        jobs_for_user = [item["job"] for item in get_matching_jobs_for_profile(unalerted, profile)[:20]]

        if not jobs_for_user:
            continue

        send_email(user["email"], jobs_for_user[:20])
        for job in jobs_for_user[:20]:
            alerts_collection.insert_one({
                "user_id": user["_id"],
                "user_email": user["email"],
                "profile_version": profile_version,
                "match_source": match_source,
                "job_id": job["_id"],
                "job_title": job.get("title"),
                "job_company": job.get("company"),
                "job_url": job.get("url"),
                "sent_at": datetime.utcnow(),
            })
            delivered.append({"email": user["email"], "job_url": job.get("url")})

    return {
        "delivered": delivered,
        "matches": len(delivered),
        "new_jobs_fetched": len(new_jobs),
        "active_users_checked": len(active_users),
    }
