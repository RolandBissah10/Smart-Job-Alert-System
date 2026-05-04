from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import logging

from app.config import SCHEDULER_INTERVAL_MINUTES
from app.db.database import alerts_collection, jobs_collection, saved_jobs_collection, users_collection
from app.services.job_filters import build_fresh_jobs_filter
from app.services.matcher import get_matching_jobs_for_profile, profile_has_match_criteria
from app.services.notifier import send_email
from app.services.scraper import fetch_jobs, save_jobs

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


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
        profile = user.get("profile", {})
        profile_version = user.get("profile_version", 1)
        if not profile_has_match_criteria(profile):
            logger.info(f"Skipping {user['email']} - no profile preferences set")
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

        matched = [item["job"] for item in get_matching_jobs_for_profile(unalerted, profile)[:20]]
        if not matched:
            logger.info(f"No new matches for {user['email']}")
            continue

        inserted_ids = []
        for job in matched:
            try:
                result = alerts_collection.insert_one({
                    "user_id": user["_id"],
                    "user_email": user["email"],
                    "profile_version": profile_version,
                    "job_id": job["_id"],
                    "job_title": job.get("title", ""),
                    "job_company": job.get("company", ""),
                    "job_url": job.get("url", ""),
                    "sent_at": datetime.utcnow(),
                })
                inserted_ids.append(result.inserted_id)
            except Exception:
                pass

        try:
            send_email(user["email"], matched)
            total_sent += 1
            logger.info(f"Digest sent to {user['email']} with {len(matched)} jobs")
        except Exception as e:
            logger.error(f"Email failed for {user['email']}: {e} - rolling back alerts so they retry")
            if inserted_ids:
                alerts_collection.delete_many({"_id": {"$in": inserted_ids}})

    logger.info(f"Pipeline done. Digest emails sent: {total_sent}")


scheduler.add_job(
    run_job_pipeline,
    "interval",
    minutes=SCHEDULER_INTERVAL_MINUTES,
    id="run-job-pipeline",
    replace_existing=True,
)
