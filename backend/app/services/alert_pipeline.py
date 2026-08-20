"""Shared alert-processing logic used by the scheduler, the manual pipeline
route, and the Celery task - so all three run identical matching/sending
behavior instead of three independently-maintained copies.
"""

from datetime import datetime

from app.db.database import alert_configs_collection, alerts_collection, jobs_collection
from app.services.job_filters import build_fresh_jobs_filter
from app.services.matcher import (
    get_matching_jobs_for_profile,
    profile_has_match_criteria,
    _match_location,
    _match_job_type,
    _match_work_authorization,
    normalize,
)
from app.services.notifier import send_email
from app.services.profile_utils import build_match_profile
from app.services.scoring import compute_match

MAX_JOBS_PER_ALERT = 20
CRITERIA_OVERRIDE_FIELDS = ["roles", "industry", "location", "job_type", "match_source"]

# The synthetic default alert (used for users with no explicit alert_configs)
# preserves the exact legacy behavior: widen the freshness window if the strict
# one turns up too few jobs. Explicit user-created alerts don't get this - if
# someone picks "Last 7 days" on purpose, silently widening it to 30 without
# telling them would contradict what they configured.
MIN_JOBS_BEFORE_FALLBACK = 10
FALLBACK_FRESHNESS_DAYS = 30


def _effective_profile(base_profile: dict, criteria: dict) -> dict:
    profile = dict(base_profile)
    for field in CRITERIA_OVERRIDE_FIELDS:
        value = criteria.get(field)
        if value:
            profile[field] = value
    return profile


def _fetch_fresh_jobs(freshness_days, allow_fallback: bool) -> list:
    if freshness_days is None:
        return list(jobs_collection.find({}).sort("created_at", -1).limit(500))

    jobs = list(jobs_collection.find(build_fresh_jobs_filter(freshness_days)).sort("created_at", -1).limit(500))
    if allow_fallback and len(jobs) < MIN_JOBS_BEFORE_FALLBACK:
        jobs = list(jobs_collection.find(build_fresh_jobs_filter(FALLBACK_FRESHNESS_DAYS)).sort("created_at", -1).limit(500))
    return jobs


def _profile_mode_matches(jobs: list, profile: dict, min_match_score: int) -> list:
    scored = []
    for match in get_matching_jobs_for_profile(jobs, profile):
        job = match["job"]
        result = compute_match(job, profile)
        if result["score"] >= min_match_score:
            scored.append({"job": job, "score": result["score"], "reasons": result["reasons"] or match["reasons"]})
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored


def _company_mode_matches(jobs: list, profile: dict, target_companies: list) -> list:
    """Bypasses skill/role gating entirely - a job qualifies just by being at
    one of the listed companies - but still respects the hard eligibility gates
    (location/job type/work authorization), which must never be bypassable."""
    wanted = {c.strip().lower() for c in target_companies if c and c.strip()}
    matches = []
    for job in jobs:
        if normalize(job.get("company", "")) not in wanted:
            continue
        if not _match_location(job, profile) or not _match_job_type(job, profile) or not _match_work_authorization(job, profile):
            continue
        matches.append({"job": job, "score": 100, "reasons": [f"Target company: {job.get('company', '')}"]})
    return matches


def _run_one_alert(user: dict, base_profile: dict, alert_id, alert_name, criteria: dict) -> list:
    freshness_days = criteria.get("freshness_days", 7)
    is_synthetic_default = alert_id is None
    jobs = _fetch_fresh_jobs(freshness_days, allow_fallback=is_synthetic_default)

    sent_ids = {
        a["job_id"]
        for a in alerts_collection.find({"user_id": user["_id"], "alert_config_id": alert_id}, {"job_id": 1})
    }
    jobs = [j for j in jobs if j["_id"] not in sent_ids]
    if not jobs:
        return []

    effective_profile = _effective_profile(base_profile, criteria)
    target_companies = criteria.get("target_companies") or []

    if target_companies:
        scored = _company_mode_matches(jobs, effective_profile, target_companies)
    else:
        scored = _profile_mode_matches(jobs, effective_profile, criteria.get("min_match_score") or 0)

    to_send = scored[:MAX_JOBS_PER_ALERT]
    if not to_send:
        return []

    now = datetime.utcnow()
    inserted_ids = []
    jobs_to_send = []
    for match in to_send:
        job = match["job"]
        try:
            result = alerts_collection.insert_one({
                "user_id": user["_id"],
                "user_email": user["email"],
                "alert_config_id": alert_id,
                "profile_version": user.get("profile_version", 1),
                "match_source": effective_profile.get("match_source", "profile"),
                "job_id": job["_id"],
                "job_title": job.get("title", ""),
                "job_company": job.get("company", ""),
                "job_url": job.get("url", ""),
                "sent_at": now,
            })
            inserted_ids.append(result.inserted_id)
            jobs_to_send.append(job)
        except Exception:
            pass  # already sent for this alert (unique index) or a transient error - skip it

    if not jobs_to_send:
        return []

    try:
        send_email(user["email"], jobs_to_send, alert_name=alert_name)
    except Exception:
        if inserted_ids:
            alerts_collection.delete_many({"_id": {"$in": inserted_ids}})
        raise

    return jobs_to_send


def process_user_alerts(user: dict) -> list:
    """Runs every active alert for this user (or, if they have none, one
    synthetic default alert built purely from their profile - preserving
    today's single-implicit-alert behavior with zero migration needed).
    Returns [{"alert_name": str|None, "jobs_sent": [job, ...]}] for whatever
    actually got sent."""
    base_profile = build_match_profile(user)
    alert_docs = list(alert_configs_collection.find({"user_id": user["_id"], "is_active": True}))

    results = []

    if not alert_docs:
        if not profile_has_match_criteria(base_profile):
            return []
        default_criteria = {"freshness_days": 7, "min_match_score": 0}
        sent = _run_one_alert(user, base_profile, alert_id=None, alert_name=None, criteria=default_criteria)
        if sent:
            results.append({"alert_name": None, "jobs_sent": sent})
        return results

    for alert in alert_docs:
        criteria = alert.get("criteria", {})
        # A company-mode alert is valid on its own even with an otherwise-empty
        # profile; profile-mode alerts still need real skill/role/CV data.
        if not criteria.get("target_companies"):
            effective_profile = _effective_profile(base_profile, criteria)
            if not profile_has_match_criteria(effective_profile):
                continue
        sent = _run_one_alert(user, base_profile, alert_id=alert["_id"], alert_name=alert.get("name"), criteria=criteria)
        if sent:
            results.append({"alert_name": alert.get("name"), "jobs_sent": sent})

    return results
