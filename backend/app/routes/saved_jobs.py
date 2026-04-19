from fastapi import APIRouter, HTTPException, Depends
from app.db.database import saved_jobs_collection
from app.auth import verify_access_token
from datetime import datetime

router = APIRouter(prefix="/saved-jobs", tags=["Saved Jobs"])


def get_current_user(token: str = Depends(lambda: None)):
    if not token:
        raise HTTPException(status_code=401, detail="Token missing")
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["email"]


@router.post("/")
def save_job(job_id: str, user_email: str = Depends(get_current_user)):
    existing = saved_jobs_collection.find_one({"user_email": user_email, "job_id": job_id})
    if existing:
        raise HTTPException(status_code=400, detail="Job already saved")

    saved_jobs_collection.insert_one({
        "user_email": user_email,
        "job_id": job_id,
        "saved_at": datetime.utcnow(),
    })
    return {"message": "Job saved"}


@router.get("/")
def get_saved_jobs(user_email: str = Depends(get_current_user)):
    saved = list(saved_jobs_collection.find({"user_email": user_email}))
    return saved


@router.delete("/{job_id}")
def unsave_job(job_id: str, user_email: str = Depends(get_current_user)):
    result = saved_jobs_collection.delete_one({"user_email": user_email, "job_id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved job not found")
    return {"message": "Job unsaved"}
