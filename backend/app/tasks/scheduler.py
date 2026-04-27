from apscheduler.schedulers.background import BackgroundScheduler
from app.services.scraper import fetch_jobs, save_jobs
from app.services.matcher import match_score, _get_keywords_from_profile
from app.services.notifier import send_email
from app.db.database import alerts_collection, jobs_collection, users_collection, saved_jobs_collection
from app.config import SCHEDULER_INTERVAL_MINUTES
from datetime import datetime, timedelta
from bson import ObjectId
import logging

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

    # Step 1: remove listings no longer active on job boards
    try:
        _cleanup_stale_jobs()
    except Exception as e:
        logger.error(f"Cleanup error: {e}")

    # Step 2: fetch and save new jobs from all sources
    try:
        fetched = fetch_jobs()
        save_jobs(fetched)
        logger.info(f"Fetched {len(fetched)} jobs, saved new ones to DB")
    except Exception as e:
        logger.error(f"Fetch/save error: {e}")

    # Step 2: for every active user, find unalerted matching jobs and send one digest
    users = list(users_collection.find({"is_active": True}))
    logger.info(f"Checking {len(users)} active users")

    total_sent = 0
    for user in users:
        profile = user.get("profile", {})
        if not profile.get("skills") and not profile.get("tech_stack") and not profile.get("roles"):
            logger.info(f"Skipping {user['email']} — no profile preferences set")
            continue

        keywords = _get_keywords_from_profile(profile)

        # Find job IDs already sent to this user
        sent_ids = [
            a["job_id"]
            for a in alerts_collection.find({"user_id": user["_id"]}, {"job_id": 1})
        ]

        # Only consider jobs scraped in the last 7 days to keep alerts fresh
        recent_cutoff = datetime.utcnow() - timedelta(days=7)
        unalerted = list(
            jobs_collection.find({
                "_id": {"$nin": sent_ids},
                "created_at": {"$gte": recent_cutoff},
            }).limit(500)
        )

        # Score and filter
        matched = [j for j in unalerted if match_score(j, keywords) > 0]
        matched.sort(key=lambda j: match_score(j, keywords), reverse=True)
        matched = matched[:20]  # cap at 20 jobs per email

        if not matched:
            logger.info(f"No new matches for {user['email']}")
            continue

        # Insert alert records so we don't double-send on retry
        inserted_ids = []
        for job in matched:
            try:
                result = alerts_collection.insert_one({
                    "user_id": user["_id"],
                    "user_email": user["email"],
                    "job_id": job["_id"],
                    "job_title": job.get("title", ""),
                    "job_company": job.get("company", ""),
                    "job_url": job.get("url", ""),
                    "sent_at": datetime.utcnow(),
                })
                inserted_ids.append(result.inserted_id)
            except Exception:
                pass  # already exists from a previous run

        # Send the digest email; roll back alert records if it fails so we retry next run
        try:
            send_email(user["email"], matched)
            total_sent += 1
            logger.info(f"Digest sent to {user['email']} with {len(matched)} jobs")
        except Exception as e:
            logger.error(f"Email failed for {user['email']}: {e} — rolling back alerts so they retry")
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
