import hmac
import time
import re
import logging

from fastapi import APIRouter, HTTPException, Header, Query
from app.services.scraper import fetch_jobs, save_jobs
from app.services.matcher import score_jobs_for_user, profile_has_match_criteria
from app.services.job_filters import build_fresh_jobs_filter
from app.services.profile_utils import build_match_profile
from app.services.alert_pipeline import process_user_alerts
from app.tasks.scheduler import _cleanup_stale_jobs
from app.db.database import users_collection, jobs_collection
from app.auth import verify_access_token
from app.cache import cache
from app.config import PIPELINE_SECRET
from app.performance import perf_monitor

logger = logging.getLogger(__name__)
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


@router.get("/companies")
def search_companies(q: str = Query("", max_length=100), limit: int = Query(10, ge=1, le=25)):
    """Company-name suggestions drawn from real scraped job postings - used to
    power autocomplete on target-company inputs. No auth required: this is the
    same sensitivity level as /jobs/scrape (public job posting data)."""
    query = q.strip()

    if not query:
        pipeline = [
            {"$match": {"company": {"$nin": [None, ""]}}},
            {"$group": {"_id": "$company", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]
        companies = [doc["_id"] for doc in jobs_collection.aggregate(pipeline)]
        return {"companies": companies}

    pattern = re.compile(re.escape(query), re.IGNORECASE)
    names = [n for n in jobs_collection.distinct("company", {"company": pattern}) if n]
    query_lower = query.lower()
    names.sort(key=lambda n: (not n.lower().startswith(query_lower), n.lower()))
    return {"companies": names[:limit]}


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

    profile = build_match_profile(user)
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
def run_pipeline(x_pipeline_secret: str = Header(None)):
    # If PIPELINE_SECRET isn't configured (e.g. local dev), stay open exactly as
    # before - only enforce the check once a real secret is actually set.
    if PIPELINE_SECRET and not hmac.compare_digest(x_pipeline_secret or "", PIPELINE_SECRET):
        raise HTTPException(status_code=401, detail="Invalid or missing pipeline secret")

    start = time.perf_counter()
    try:
        _cleanup_stale_jobs()
    except Exception as e:
        logger.error(f"Cleanup error: {e}")

    jobs = fetch_jobs()
    new_jobs = save_jobs(jobs)
    active_users = list(users_collection.find({"is_active": True}))

    delivered = []
    for user in active_users:
        try:
            alert_results = process_user_alerts(user)
        except Exception as e:
            logger.error(f"Alert processing failed for {user['email']}: {e}")
            continue

        for result in alert_results:
            for job in result["jobs_sent"]:
                delivered.append({"email": user["email"], "job_url": job.get("url")})

    duration_seconds = round(time.perf_counter() - start, 2)
    logger.info(f"Manual pipeline completed in {duration_seconds}s")
    perf_monitor.record_pipeline_time(duration_seconds, source="manual")

    return {
        "delivered": delivered,
        "matches": len(delivered),
        "new_jobs_fetched": len(new_jobs),
        "active_users_checked": len(active_users),
        "duration_seconds": duration_seconds,
    }
