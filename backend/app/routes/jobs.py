import hmac
import time
import re
import logging
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Header, Query
from app.services.scraper import fetch_jobs, save_jobs
from app.services.matcher import score_jobs_for_user, profile_has_match_criteria
from app.services.job_filters import fetch_fresh_jobs
from app.services.profile_utils import build_match_profile
from app.services.alert_pipeline import process_user_alerts
from app.tasks.scheduler import _cleanup_stale_jobs
from app.db.database import users_collection, jobs_collection, pipeline_status_collection
from app.auth import require_auth
from app.cache import cache
from app.config import PIPELINE_SECRET
from app.performance import perf_monitor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["Jobs"])


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
    q: str = Query("", max_length=200),
    sort: str = Query("score", pattern="^(score|date)$"),
):
    email = require_auth(authorization)
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = build_match_profile(user)
    if not profile_has_match_criteria(profile):
        return {"jobs": [], "total": 0, "page": page, "page_size": page_size, "profile_required": True}

    profile_version = user.get("profile_version", 1)
    query = q.strip().lower()

    # Cache key for job feed - must be scoped per user, not just profile_version,
    # since two different users commonly share the same (default) profile_version
    # and would otherwise be served each other's scored results from the cache.
    cache_key = f"job_feed:{email}:{profile_version}:{page}:{page_size}:{query}:{sort}"

    # Try to get cached data
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    # Cache fresh jobs for 10 minutes
    jobs_cache_key = f"fresh_jobs:{profile_version}"
    jobs = cache.get(jobs_cache_key)
    if jobs is None:
        # Show only jobs confirmed active in the last 7 days (last_seen_at refreshed each
        # scrape), falling back to 30 days for sparse DBs or before first pipeline run.
        jobs = fetch_fresh_jobs(7)
        cache.set(jobs_cache_key, jobs, 600)  # 10 minutes

    # Score jobs; only return those with a positive match score (no random fallback).
    # score_jobs_for_user already sorts by score descending.
    all_scored = score_jobs_for_user(jobs, profile)

    if query:
        all_scored = [
            item for item in all_scored
            if query in item["job"].get("title", "").lower()
            or query in item["job"].get("company", "").lower()
            or query in item["job"].get("location", "").lower()
        ]

    if sort == "date":
        all_scored = sorted(
            all_scored,
            key=lambda item: item["job"].get("posted_date") or item["job"].get("created_at") or datetime.min,
            reverse=True,
        )

    total = len(all_scored)
    skip = (page - 1) * page_size
    paginated = all_scored[skip: skip + page_size]

    result = {"jobs": paginated, "total": total, "page": page, "page_size": page_size, "profile_required": False}

    # Cache the result for 5 minutes
    cache.set(cache_key, result, 300)

    return result


PIPELINE_STALE_SECONDS = 10 * 60  # a run stuck past this is treated as crashed, not actually in progress


def _pipeline_request_authorized(x_pipeline_secret: str, authorization: str) -> bool:
    """Either the GitHub Actions cron secret or a logged-in dashboard user - never
    both required, and (unlike before) never skipped just because the secret
    happens to be unset."""
    if PIPELINE_SECRET and hmac.compare_digest(x_pipeline_secret or "", PIPELINE_SECRET):
        return True
    if authorization:
        try:
            require_auth(authorization)
            return True
        except HTTPException:
            return False
    return False


@router.post("/run-pipeline")
def run_pipeline(
    background_tasks: BackgroundTasks,
    x_pipeline_secret: str = Header(None),
    authorization: str = Header(None),
):
    if not _pipeline_request_authorized(x_pipeline_secret, authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing pipeline secret")

    now = datetime.utcnow()
    status = pipeline_status_collection.find_one({"_id": "current"})
    if status and status.get("running"):
        started_at = status.get("started_at")
        stale = not started_at or (now - started_at).total_seconds() > PIPELINE_STALE_SECONDS
        if not stale:
            return {"status": "already_running", "started_at": started_at}
        logger.warning("Previous pipeline run never reported completion - treating as crashed and starting a new one")

    pipeline_status_collection.update_one(
        {"_id": "current"},
        {"$set": {"running": True, "started_at": now, "error": None}},
        upsert=True,
    )
    background_tasks.add_task(_run_pipeline_job)
    return {"status": "started", "started_at": now}


def _run_pipeline_job():
    """The actual scrape/match/send work, run after the HTTP response has
    already gone out - this used to run inline in the request handler and took
    76-155s in practice, holding a worker thread the whole time and routinely
    exceeding callers' HTTP timeouts."""
    start = time.perf_counter()
    error = None
    matches = 0
    new_jobs_count = 0
    active_users_count = 0
    try:
        try:
            _cleanup_stale_jobs()
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

        new_jobs_count = len(save_jobs(fetch_jobs()))
        active_users = list(users_collection.find({"is_active": True, "alerts_paused": {"$ne": True}}))
        active_users_count = len(active_users)

        for user in active_users:
            try:
                alert_results = process_user_alerts(user)
            except Exception as e:
                logger.error(f"Alert processing failed for {user['email']}: {e}")
                continue
            matches += sum(len(result["jobs_sent"]) for result in alert_results)
    except Exception as e:
        logger.error(f"Pipeline run failed: {e}")
        error = str(e)
    finally:
        duration_seconds = round(time.perf_counter() - start, 2)
        logger.info(f"Pipeline completed in {duration_seconds}s")
        perf_monitor.record_pipeline_time(duration_seconds, source="manual")
        pipeline_status_collection.update_one(
            {"_id": "current"},
            {"$set": {
                "running": False,
                "finished_at": datetime.utcnow(),
                "error": error,
                # Aggregate only - the previous synchronous response included a
                # per-match {email, job_url} list, readable by anyone who could
                # reach this endpoint (which, with PIPELINE_SECRET unset, was
                # effectively anyone). Never expose other users' emails here.
                "last_result": {
                    "matches": matches,
                    "new_jobs_fetched": new_jobs_count,
                    "active_users_checked": active_users_count,
                    "duration_seconds": duration_seconds,
                },
            }},
            upsert=True,
        )


@router.get("/pipeline-status")
def get_pipeline_status(authorization: str = Header(None)):
    require_auth(authorization)
    status = pipeline_status_collection.find_one({"_id": "current"}) or {}
    return {
        "running": status.get("running", False),
        "started_at": status.get("started_at"),
        "finished_at": status.get("finished_at"),
        "error": status.get("error"),
        "last_result": status.get("last_result"),
    }
