from datetime import datetime, timedelta


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
