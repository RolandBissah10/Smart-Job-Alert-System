from pydantic import BaseModel
from typing import List, Optional

VALID_FRESHNESS_DAYS = {1, 3, 7, 14, 30, None}


class AlertCriteria(BaseModel):
    roles: Optional[List[str]] = None
    industry: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    match_source: Optional[str] = None
    freshness_days: Optional[int] = 7
    min_match_score: Optional[int] = 0
    target_companies: Optional[List[str]] = None


class AlertConfigCreate(BaseModel):
    name: str
    is_active: Optional[bool] = True
    criteria: AlertCriteria = AlertCriteria()


class AlertConfigUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    criteria: Optional[AlertCriteria] = None
