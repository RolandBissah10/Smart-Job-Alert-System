from apscheduler.schedulers.background import BackgroundScheduler
from app.services.scraper import fetch_jobs, save_jobs
from app.services.matcher import match_score, _get_keywords_from_profile
from app.services.notifier import send_email
from app.db.database import alerts_collection, jobs_collection, users_collection
from app.config import SCHEDULER_INTERVAL_MINUTES
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def run_job_pipeline():
    logger.info("Pipeline started")

    # Step 1: fetch and save new jobs from all sources
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
        if not profile.get("tech_stack") and not profile.get("roles"):
            logger.info(f"Skipping {user['email']} — no profile preferences set")
            continue

        keywords = _get_keywords_from_profile(profile)

        # Find job IDs already sent to this user
        sent_ids = [
            a["job_id"]
            for a in alerts_collection.find({"user_id": user["_id"]}, {"job_id": 1})
        ]

        # Get jobs not yet sent to this user
        unalerted = list(
            jobs_collection.find({"_id": {"$nin": sent_ids}}).limit(500)
        )

        # Score and filter
        matched = [j for j in unalerted if match_score(j, keywords) > 0]
        matched.sort(key=lambda j: match_score(j, keywords), reverse=True)
        matched = matched[:20]  # cap at 20 jobs per email

        if not matched:
            logger.info(f"No new matches for {user['email']}")
            continue

        # Mark as alerted BEFORE sending so re-runs don't double-send
        for job in matched:
            try:
                alerts_collection.insert_one({
                    "user_id": user["_id"],
                    "user_email": user["email"],
                    "job_id": job["_id"],
                    "job_title": job.get("title", ""),
                    "job_company": job.get("company", ""),
                    "job_url": job.get("url", ""),
                    "sent_at": datetime.utcnow(),
                })
            except Exception:
                pass  # already exists, fine

        # Send one digest email with all matches
        try:
            send_email(user["email"], matched)
            total_sent += 1
            logger.info(f"Digest sent to {user['email']} with {len(matched)} jobs")
        except Exception as e:
            logger.error(f"Email failed for {user['email']}: {e}")

    logger.info(f"Pipeline done. Digest emails sent: {total_sent}")


scheduler.add_job(
    run_job_pipeline,
    "interval",
    minutes=SCHEDULER_INTERVAL_MINUTES,
    id="run-job-pipeline",
    replace_existing=True,
)
