from pymongo import MongoClient, DESCENDING
from app.config import MONGO_URL
import logging

logger = logging.getLogger(__name__)

client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=10000)
db = client["job_scraper"]

users_collection = db["users"]
jobs_collection = db["jobs"]
alerts_collection = db["alerts"]
saved_jobs_collection = db["saved_jobs"]

try:
    users_collection.create_index("email", unique=True)
    jobs_collection.create_index("url", unique=True, sparse=True)
    jobs_collection.create_index([("created_at", DESCENDING)])
    jobs_collection.create_index("created_at", expireAfterSeconds=15 * 24 * 60 * 60)
    alerts_collection.create_index([("user_id", 1), ("job_id", 1)], unique=True, sparse=True)
    saved_jobs_collection.create_index([("user_email", 1), ("job_id", 1)], unique=True, sparse=True)
except Exception as e:
    logger.warning(f"Index creation skipped: {e}")
