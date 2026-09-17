from datetime import datetime, timedelta

from app.db.database import jobs_collection

JOBS_FETCH_LIMIT = 500


def fetch_fresh_jobs(freshness_days) -> list:
    """Jobs confirmed active within `freshness_days`, newest first. `None` means
    no freshness filter at all. Scoped strictly to the requested window - no
    widening beyond what was asked for, even if that turns up few results."""
    if freshness_days is None:
        return list(jobs_collection.find({}).sort("created_at", -1).limit(JOBS_FETCH_LIMIT))

    return list(
        jobs_collection.find(build_fresh_jobs_filter(freshness_days)).sort("created_at", -1).limit(JOBS_FETCH_LIMIT)
    )


def build_fresh_jobs_filter(days: int):
    """Prefer the job's real posted_date when we have one (freshness should be
    based on when a job was actually posted, not when our scraper found it).
    Jobs without a posted_date (most sources, and every job scraped before this
    field existed) fall back to the old last_seen_at/created_at behavior."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    # Querying a field as `None` in MongoDB matches both an explicit null AND a
    # missing field, so this covers jobs saved before posted_date existed as well
    # as sources (e.g. glmis_ghana, arc_ghana) that set it to None explicitly.
    return {
        "$or": [
            {"posted_date": {"$gte": cutoff}},
            {"posted_date": None, "last_seen_at": {"$gte": cutoff}},
            {"posted_date": None, "last_seen_at": {"$exists": False}, "created_at": {"$gte": cutoff}},
        ]
    }
