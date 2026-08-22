from datetime import datetime, timedelta
import logging
import time

from app.db.database import jobs_collection, saved_jobs_collection, users_collection
from app.services.alert_pipeline import process_user_alerts
from app.services.scraper import fetch_jobs, save_jobs
from app.performance import perf_monitor

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


def run_job_pipeline():
    start = time.perf_counter()
    logger.info("Pipeline started")

    try:
        _cleanup_stale_jobs()
    except Exception as e:
        logger.error(f"Cleanup error: {e}")

    try:
        fetched = fetch_jobs()
        save_jobs(fetched)
        logger.info(f"Fetched {len(fetched)} jobs, saved new ones to DB")
    except Exception as e:
        logger.error(f"Fetch/save error: {e}")

    users = list(users_collection.find({"is_active": True}))
    logger.info(f"Checking {len(users)} active users")

    total_sent = 0
    for user in users:
        try:
            alert_results = process_user_alerts(user)
        except Exception as e:
            logger.error(f"Alert processing failed for {user['email']}: {e}")
            continue

        if not alert_results:
            logger.info(f"No new matches for {user['email']}")
            continue

        total_sent += len(alert_results)
        for result in alert_results:
            label = result["alert_name"] or "default"
            logger.info(f"Digest sent to {user['email']} ({label}) with {len(result['jobs_sent'])} jobs")

    elapsed = time.perf_counter() - start
    logger.info(f"Pipeline done. Digest emails sent: {total_sent} in {elapsed:.2f}s")
    perf_monitor.record_pipeline_time(elapsed, source="scheduler")
