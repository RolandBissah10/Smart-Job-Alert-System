from datetime import datetime, timedelta
import logging

from app.db.database import jobs_collection, saved_jobs_collection

logger = logging.getLogger(__name__)


def _cleanup_stale_jobs():
    """Delete jobs not seen in the last 7 days, skipping any a user has saved."""
    cutoff = datetime.utcnow() - timedelta(days=7)
    saved_ids = {r["job_id"] for r in saved_jobs_collection.find({}, {"job_id": 1})}

    stale = jobs_collection.find(
        {"last_seen_at": {"$lt": cutoff}},
        {"_id": 1},
    )
    to_delete = [
        doc["_id"] for doc in stale
        if str(doc["_id"]) not in saved_ids
    ]
    if to_delete:
        result = jobs_collection.delete_many({"_id": {"$in": to_delete}})
        logger.info(f"Cleanup: removed {result.deleted_count} stale jobs")
    else:
        logger.info("Cleanup: no stale jobs to remove")
