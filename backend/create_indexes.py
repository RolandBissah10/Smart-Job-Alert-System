"""
Database indexes for performance optimization.
Run this script once to create indexes on your MongoDB collections.
"""

from app.db.database import users_collection, jobs_collection, alerts_collection, saved_jobs_collection
from pymongo import ASCENDING, DESCENDING


def create_indexes():
    """Create database indexes for better query performance"""

    print("Creating database indexes...")

    # Users collection indexes
    users_collection.create_index([("email", ASCENDING)], unique=True)
    users_collection.create_index([("username", ASCENDING)], unique=True)
    users_collection.create_index([("is_active", ASCENDING)])

    # Jobs collection indexes
    jobs_collection.create_index([("created_at", DESCENDING)])
    jobs_collection.create_index([("last_seen_at", DESCENDING)])
    jobs_collection.create_index([("company", ASCENDING)])
    jobs_collection.create_index([("title", ASCENDING)])
    jobs_collection.create_index([("location", ASCENDING)])
    # Compound index for fresh jobs filter
    jobs_collection.create_index([
        ("last_seen_at", DESCENDING),
        ("created_at", DESCENDING)
    ])

    # Alerts collection indexes
    alerts_collection.create_index([("user_id", ASCENDING)])
    alerts_collection.create_index([("profile_version", ASCENDING)])
    alerts_collection.create_index([("sent_at", DESCENDING)])
    # Compound index for user alerts
    alerts_collection.create_index([
        ("user_id", ASCENDING),
        ("profile_version", ASCENDING),
        ("sent_at", DESCENDING)
    ])

    # Saved jobs collection indexes
    saved_jobs_collection.create_index([("user_email", ASCENDING)])
    saved_jobs_collection.create_index([("job_id", ASCENDING)])
    saved_jobs_collection.create_index([("saved_at", DESCENDING)])
    # Compound index for user saved jobs
    saved_jobs_collection.create_index([
        ("user_email", ASCENDING),
        ("saved_at", DESCENDING)
    ])

    print("✅ Database indexes created successfully!")


if __name__ == "__main__":
    create_indexes()