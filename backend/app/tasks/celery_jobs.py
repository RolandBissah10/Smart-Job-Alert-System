import logging

from app.celery_app import celery
from app.db.database import users_collection
from app.services.alert_pipeline import process_user_alerts
from app.services.scraper import fetch_jobs, save_jobs

logger = logging.getLogger(__name__)


@celery.task
def run_job_pipeline():
    jobs = fetch_jobs()
    save_jobs(jobs)

    for user in users_collection.find({"is_active": True}):
        try:
            process_user_alerts(user)
        except Exception as e:
            logger.error(f"Alert processing failed for {user['email']}: {e}")
