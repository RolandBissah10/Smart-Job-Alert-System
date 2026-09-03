from datetime import datetime

from fastapi import APIRouter, Header, HTTPException

from app.auth import require_auth
from app.db.database import alerts_collection, users_collection

router = APIRouter(prefix="/notifications", tags=["Notifications"])

NOTIFICATIONS_LIMIT = 30


def _get_user(email: str) -> dict:
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/")
def get_notifications(authorization: str = Header(None)):
    """In-app fallback for alert emails - alerts_collection records the job
    match regardless of whether the email itself actually sent, so this stays
    accurate even when email delivery is broken."""
    email = require_auth(authorization)
    user = _get_user(email)

    # Never explicitly marked seen -> everything counts as unread. This
    # matters for the realistic case of a pipeline run finding matches while
    # the user isn't logged in at all - the first time they open the
    # dashboard afterward should show those as new, not silently mark them
    # "seen" just because it happens to be this account's first-ever check.
    last_seen = user.get("last_notifications_seen_at") or datetime.min

    records = list(
        alerts_collection.find({"user_id": user["_id"]})
        .sort("sent_at", -1)
        .limit(NOTIFICATIONS_LIMIT)
    )

    items = [
        {
            "id": str(r["_id"]),
            "job_title": r.get("job_title", ""),
            "job_company": r.get("job_company", ""),
            "job_url": r.get("job_url", ""),
            "sent_at": r.get("sent_at"),
            "email_sent": r.get("email_sent", True),
        }
        for r in records
    ]
    unread_count = sum(1 for r in records if r.get("sent_at") and r["sent_at"] > last_seen)

    return {"items": items, "unread_count": unread_count}


@router.put("/seen")
def mark_notifications_seen(authorization: str = Header(None)):
    email = require_auth(authorization)
    result = users_collection.update_one(
        {"email": email},
        {"$set": {"last_notifications_seen_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Notifications marked as seen"}
