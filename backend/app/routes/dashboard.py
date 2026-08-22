from collections import Counter
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Header
from app.db.database import users_collection, alerts_collection, saved_jobs_collection
from app.auth import require_auth
from app.services.job_filters import fetch_fresh_jobs
from app.services.matcher import score_jobs_for_user, profile_has_match_criteria
from app.services.profile_utils import build_match_profile
from app.services.seniority import LEVEL_ORDER
from app.cache import cache, cached

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/")
def get_dashboard(authorization: str = Header(None)):
    email = require_auth(authorization)
    user = users_collection.find_one({"email": email}, {"password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user["_id"]
    profile = build_match_profile(user)
    profile_version = user.get("profile_version", 1)
    profile_complete = profile_has_match_criteria(profile)

    # Cache key for user's dashboard data
    cache_key = f"dashboard:{email}:{profile_version}"

    # Try to get cached data
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    # Get basic stats (these change less frequently)
    saved_count = saved_jobs_collection.count_documents({"user_email": email})

    alerts_count = 0
    total_jobs = 0
    recent_alerts = []

    if profile_complete:
        # Cache alerts count for 5 minutes
        alerts_cache_key = f"alerts_count:{user_id}:{profile_version}"
        alerts_count = cache.get(alerts_cache_key)
        if alerts_count is None:
            alerts_count = alerts_collection.count_documents({
                "user_id": user_id,
                "profile_version": profile_version,
            })
            cache.set(alerts_cache_key, alerts_count, 300)  # 5 minutes

        # Cache job matching for 10 minutes (jobs don't change that frequently)
        jobs_cache_key = f"matching_jobs:{profile_version}"
        fresh_jobs = cache.get(jobs_cache_key)
        if fresh_jobs is None:
            fresh_jobs = fetch_fresh_jobs(7)
            cache.set(jobs_cache_key, fresh_jobs, 600)  # 10 minutes

        total_jobs = len(score_jobs_for_user(fresh_jobs, profile))

        # Get recent alerts (cache for 2 minutes)
        alerts_cache_key_recent = f"recent_alerts:{user_id}:{profile_version}"
        recent_alerts = cache.get(alerts_cache_key_recent)
        if recent_alerts is None:
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
            cache.set(alerts_cache_key_recent, recent_alerts, 120)  # 2 minutes

    result = {
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

    # Cache the complete dashboard response for 2 minutes
    cache.set(cache_key, result, 120)

    return result


SCORE_BUCKETS = [
    ("0-19", 0, 20),
    ("20-39", 20, 40),
    ("40-59", 40, 60),
    ("60-79", 60, 80),
    ("80-100", 80, 101),
]
ALERTS_OVER_TIME_DAYS = 14


@router.get("/analytics")
def get_analytics(authorization: str = Header(None)):
    email = require_auth(authorization)
    user = users_collection.find_one({"email": email}, {"password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user["_id"]
    profile = build_match_profile(user)
    profile_version = user.get("profile_version", 1)
    profile_complete = profile_has_match_criteria(profile)

    cache_key = f"analytics:{email}:{profile_version}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    average_score = 0
    score_distribution = [{"label": label, "count": 0} for label, _, _ in SCORE_BUCKETS]
    top_skills = []
    seniority_mix = [{"level": level, "count": 0} for level in LEVEL_ORDER]

    if profile_complete:
        # Reuse the same fresh-jobs cache /dashboard/ already populates.
        jobs_cache_key = f"matching_jobs:{profile_version}"
        fresh_jobs = cache.get(jobs_cache_key)
        if fresh_jobs is None:
            fresh_jobs = fetch_fresh_jobs(7)
            cache.set(jobs_cache_key, fresh_jobs, 600)

        scored = score_jobs_for_user(fresh_jobs, profile)
        scores = [s["score"] for s in scored]
        if scores:
            average_score = round(sum(scores) / len(scores))

        bucket_counts = {label: 0 for label, _, _ in SCORE_BUCKETS}
        for s in scores:
            for label, lo, hi in SCORE_BUCKETS:
                if lo <= s < hi:
                    bucket_counts[label] += 1
                    break
        score_distribution = [{"label": label, "count": bucket_counts[label]} for label, _, _ in SCORE_BUCKETS]

        skill_counts = Counter()
        seniority_counts = Counter()
        for s in scored:
            job = s["job"]
            for skill in job.get("skills") or []:
                skill_counts[skill] += 1
            level = job.get("seniority")
            if level:
                seniority_counts[level] += 1

        top_skills = [{"skill": k, "count": v} for k, v in skill_counts.most_common(8)]
        seniority_mix = [{"level": level, "count": seniority_counts.get(level, 0)} for level in LEVEL_ORDER]

    # Alerts sent per day are historical fact - shown regardless of profile_complete,
    # since a profile change since shouldn't erase what already happened.
    cutoff = datetime.utcnow() - timedelta(days=ALERTS_OVER_TIME_DAYS - 1)
    cutoff_day = cutoff.replace(hour=0, minute=0, second=0, microsecond=0)
    alerts_raw = list(alerts_collection.find(
        {"user_id": user_id, "sent_at": {"$gte": cutoff_day}},
        {"sent_at": 1},
    ))
    day_counts = Counter(a["sent_at"].date().isoformat() for a in alerts_raw if a.get("sent_at"))
    alerts_over_time = [
        {"date": (cutoff_day + timedelta(days=i)).date().isoformat(), "count": day_counts.get((cutoff_day + timedelta(days=i)).date().isoformat(), 0)}
        for i in range(ALERTS_OVER_TIME_DAYS)
    ]

    result = {
        "profile_complete": profile_complete,
        "average_score": average_score,
        "score_distribution": score_distribution,
        "top_skills": top_skills,
        "seniority_mix": seniority_mix,
        "alerts_over_time": alerts_over_time,
    }

    cache.set(cache_key, result, 300)
    return result
