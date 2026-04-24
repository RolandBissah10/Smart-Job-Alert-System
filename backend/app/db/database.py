from pymongo import MongoClient, ASCENDING, DESCENDING
from app.config import MONGO_URL

client = MongoClient(MONGO_URL)
db = client["job_scraper"]

users_collection = db["users"]
jobs_collection = db["jobs"]
alerts_collection = db["alerts"]
saved_jobs_collection = db["saved_jobs"]

users_collection.create_index("email", unique=True)
jobs_collection.create_index("url", unique=True, sparse=True)
jobs_collection.create_index([("created_at", DESCENDING)])
jobs_collection.create_index("created_at", expireAfterSeconds=15 * 24 * 60 * 60)
alerts_collection.create_index([("user_id", 1), ("job_id", 1)], unique=True, sparse=True)
saved_jobs_collection.create_index([("user_email", 1), ("job_id", 1)], unique=True, sparse=True)
