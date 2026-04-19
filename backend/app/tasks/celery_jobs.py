from app.celery_app import celery
from app.services.scraper import fetch_jobs, save_jobs
from app.services.matcher import match_jobs_to_active_users
from app.services.notifier import send_email
from app.db.database import alerts_collection
from datetime import datetime


@celery.task
def run_job_pipeline():
    jobs = fetch_jobs()
    new_jobs = save_jobs(jobs)
    matches = match_jobs_to_active_users(new_jobs)

    for match in matches:
        user = match["user"]
        job = match["job"]
        existing = alerts_collection.find_one({"user_id": user["_id"], "job_id": job["_id"]})
        if existing:
            continue
        send_email(user["email"], [job])
        alerts_collection.insert_one({
            "user_id": user["_id"],
            "job_id": job["_id"],
            "sent_at": datetime.utcnow(),
        })
