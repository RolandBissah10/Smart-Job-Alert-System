from fastapi import APIRouter, HTTPException
from app.services.scraper import fetch_jobs, save_jobs
from app.services.matcher import match_jobs_to_active_users
from app.services.notifier import send_email
from app.db.database import alerts_collection
from datetime import datetime

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/scrape")
def scrape_jobs():
    jobs = fetch_jobs()
    new_jobs = save_jobs(jobs)
    return {"count": len(new_jobs), "new_jobs": new_jobs}


@router.post("/run-pipeline")
def run_pipeline():
    jobs = fetch_jobs()
    new_jobs = save_jobs(jobs)
    matches = match_jobs_to_active_users(new_jobs)
    delivered = []
    for match in matches:
        user = match["user"]
        job = match["job"]
        if not alerts_collection.find_one({"user_id": user["_id"], "job_id": job["_id"]}):
            send_email(user["email"], [job])
            alerts_collection.insert_one({"user_id": user["_id"], "job_id": job["_id"], "sent_at": datetime.utcnow()})
            delivered.append({"email": user["email"], "job_url": job.get("url")})
    return {"delivered": delivered, "matches": len(matches)}
