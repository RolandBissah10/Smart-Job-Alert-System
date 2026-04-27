from pydantic import BaseModel, EmailStr
from typing import List, Optional


class UserProfile(BaseModel):
    industry: Optional[str] = None
    skills: Optional[List[str]] = []
    roles: Optional[List[str]] = []
    experience_level: Optional[str] = None
    location: Optional[str] = "Remote"
    job_type: Optional[str] = "Full-time"


class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    plan: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str
