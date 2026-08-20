from pymongo import MongoClient, DESCENDING
from app.config import MONGO_URL
import logging

logger = logging.getLogger(__name__)

client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=10000)
db = client["job_scraper"]

users_collection = db["users"]
jobs_collection = db["jobs"]
alerts_collection = db["alerts"]
alert_configs_collection = db["alert_configs"]
saved_jobs_collection = db["saved_jobs"]

try:
    users_collection.create_index("email", unique=True)
    jobs_collection.create_index("url", unique=True, sparse=True)
    jobs_collection.create_index([("created_at", DESCENDING)])
    jobs_collection.create_index([("last_seen_at", DESCENDING)])
    jobs_collection.create_index([("posted_date", DESCENDING)])
    # TTL must stay on created_at (discovery time), not posted_date: a TTL index
    # silently skips documents missing the indexed field, and not every job has
    # a real posted_date, which would quietly break cleanup for those jobs.
    jobs_collection.create_index("created_at", expireAfterSeconds=15 * 24 * 60 * 60)
    try:
        alerts_collection.drop_index("user_id_1_job_id_1")
    except Exception:
        pass
    try:
        alerts_collection.drop_index("user_id_1_profile_version_1_job_id_1")
    except Exception:
        pass
    # Dedup is now per-alert (a user can run multiple named alerts, and the same
    # job may legitimately qualify for more than one of them independently).
    # alert_config_id is None for the synthetic "default" alert used by users who
    # haven't created any explicit alerts yet - both missing-field (pre-existing
    # rows) and explicit None count as null for this index, so old sent history
    # still suppresses re-sends under that fallback path.
    alerts_collection.create_index([("user_id", 1), ("alert_config_id", 1), ("job_id", 1)], unique=True, sparse=True)
    alert_configs_collection.create_index([("user_id", 1)])
    saved_jobs_collection.create_index([("user_email", 1), ("job_id", 1)], unique=True, sparse=True)
except Exception as e:
    logger.warning(f"Index creation skipped: {e}")
