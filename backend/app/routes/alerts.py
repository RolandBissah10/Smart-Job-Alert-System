from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Header

from app.auth import require_auth
from app.db.database import alert_configs_collection, users_collection
from app.models.alert import AlertConfigCreate, AlertConfigUpdate

router = APIRouter(prefix="/alerts", tags=["Alerts"])

MAX_ALERTS_PER_USER = 10


def _get_user(email: str) -> dict:
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def serialize_alert(alert: dict) -> dict:
    return {
        "id": str(alert["_id"]),
        "name": alert.get("name", ""),
        "is_active": alert.get("is_active", True),
        "criteria": alert.get("criteria", {}),
        "created_at": alert.get("created_at"),
        "updated_at": alert.get("updated_at"),
    }


def _find_owned_alert(alert_id: str, user_id) -> dict:
    try:
        object_id = ObjectId(alert_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert = alert_configs_collection.find_one({"_id": object_id, "user_id": user_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/")
def list_alerts(authorization: str = Header(None)):
    email = require_auth(authorization)
    user = _get_user(email)
    alerts = alert_configs_collection.find({"user_id": user["_id"]}).sort("created_at", 1)
    return [serialize_alert(a) for a in alerts]


@router.post("/")
def create_alert(body: AlertConfigCreate, authorization: str = Header(None)):
    email = require_auth(authorization)
    user = _get_user(email)

    existing_count = alert_configs_collection.count_documents({"user_id": user["_id"]})
    if existing_count >= MAX_ALERTS_PER_USER:
        raise HTTPException(status_code=400, detail=f"You can have at most {MAX_ALERTS_PER_USER} alerts")

    now = datetime.utcnow()
    record = {
        "user_id": user["_id"],
        "user_email": email,
        "name": body.name.strip() or "Untitled Alert",
        "is_active": body.is_active if body.is_active is not None else True,
        "criteria": body.criteria.dict(),
        "created_at": now,
        "updated_at": now,
    }
    result = alert_configs_collection.insert_one(record)
    record["_id"] = result.inserted_id
    return serialize_alert(record)


@router.put("/{alert_id}")
def update_alert(alert_id: str, body: AlertConfigUpdate, authorization: str = Header(None)):
    email = require_auth(authorization)
    user = _get_user(email)
    alert = _find_owned_alert(alert_id, user["_id"])

    update_fields = {"updated_at": datetime.utcnow()}
    if body.name is not None:
        update_fields["name"] = body.name.strip() or alert.get("name", "Untitled Alert")
    if body.is_active is not None:
        update_fields["is_active"] = body.is_active
    if body.criteria is not None:
        update_fields["criteria"] = body.criteria.dict()

    alert_configs_collection.update_one({"_id": alert["_id"]}, {"$set": update_fields})
    updated = alert_configs_collection.find_one({"_id": alert["_id"]})
    return serialize_alert(updated)


@router.delete("/{alert_id}")
def delete_alert(alert_id: str, authorization: str = Header(None)):
    email = require_auth(authorization)
    user = _get_user(email)
    alert = _find_owned_alert(alert_id, user["_id"])

    alert_configs_collection.delete_one({"_id": alert["_id"]})
    return {"message": "Alert deleted successfully"}
