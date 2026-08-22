from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from app.db.database import saved_jobs_collection, jobs_collection
from app.auth import require_auth
from datetime import datetime

router = APIRouter(prefix="/saved-jobs", tags=["Saved Jobs"])

VALID_STATUSES = {"saved", "applied", "interview", "offer", "rejected"}


class SaveJobRequest(BaseModel):
    job_id: str


class SavedJobUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


@router.post("/")
def save_job(body: SaveJobRequest, authorization: str = Header(None)):
    email = require_auth(authorization)
    existing = saved_jobs_collection.find_one({"user_email": email, "job_id": body.job_id})
    if existing:
        raise HTTPException(status_code=400, detail="Job already saved")
    saved_jobs_collection.insert_one({
        "user_email": email,
        "job_id": body.job_id,
        "saved_at": datetime.utcnow(),
        "status": "saved",
        "notes": "",
    })
    return {"message": "Job saved"}


@router.get("/")
def get_saved_jobs(authorization: str = Header(None)):
    email = require_auth(authorization)
    saved_records = list(saved_jobs_collection.find({"user_email": email}))

    result = []
    for record in saved_records:
        job_id_str = record.get("job_id", "")
        try:
            job = jobs_collection.find_one({"_id": ObjectId(job_id_str)})
        except Exception:
            job = None
        if not job:
            continue
        job["_id"] = str(job["_id"])
        job["job_id"] = job_id_str
        job["saved_at"] = record.get("saved_at")
        job["status"] = record.get("status", "saved")
        job["notes"] = record.get("notes", "")
        result.append(job)

    return result


@router.put("/{job_id}")
def update_saved_job(job_id: str, body: SavedJobUpdate, authorization: str = Header(None)):
    email = require_auth(authorization)

    if body.status is not None and body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    updates = {}
    if body.status is not None:
        updates["status"] = body.status
    if body.notes is not None:
        updates["notes"] = body.notes
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    result = saved_jobs_collection.update_one({"user_email": email, "job_id": job_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Saved job not found")
    return {"message": "Saved job updated"}


@router.delete("/{job_id}")
def unsave_job(job_id: str, authorization: str = Header(None)):
    email = require_auth(authorization)
    result = saved_jobs_collection.delete_one({"user_email": email, "job_id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved job not found")
    return {"message": "Job unsaved"}
