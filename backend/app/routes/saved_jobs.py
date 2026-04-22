from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.db.database import saved_jobs_collection
from app.auth import verify_access_token
from datetime import datetime

router = APIRouter(prefix="/saved-jobs", tags=["Saved Jobs"])


class SaveJobRequest(BaseModel):
    job_id: str


def _require_auth(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["email"]


@router.post("/")
def save_job(body: SaveJobRequest, authorization: str = Header(None)):
    email = _require_auth(authorization)
    existing = saved_jobs_collection.find_one({"user_email": email, "job_id": body.job_id})
    if existing:
        raise HTTPException(status_code=400, detail="Job already saved")
    saved_jobs_collection.insert_one({
        "user_email": email,
        "job_id": body.job_id,
        "saved_at": datetime.utcnow(),
    })
    return {"message": "Job saved"}


@router.get("/")
def get_saved_jobs(authorization: str = Header(None)):
    email = _require_auth(authorization)
    saved = list(saved_jobs_collection.find({"user_email": email}))
    for item in saved:
        item["_id"] = str(item["_id"])
    return saved


@router.delete("/{job_id}")
def unsave_job(job_id: str, authorization: str = Header(None)):
    email = _require_auth(authorization)
    result = saved_jobs_collection.delete_one({"user_email": email, "job_id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved job not found")
    return {"message": "Job unsaved"}
