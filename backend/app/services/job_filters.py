from datetime import datetime, timedelta


def build_fresh_jobs_filter(days: int):
    cutoff = datetime.utcnow() - timedelta(days=days)
    return {
        "$or": [
            {"last_seen_at": {"$gte": cutoff}},
            {"last_seen_at": {"$exists": False}, "created_at": {"$gte": cutoff}},
        ]
    }
