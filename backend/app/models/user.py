from pydantic import BaseModel, EmailStr
from typing import List, Optional


class EducationEntry(BaseModel):
    degree: Optional[str] = None
    field: Optional[str] = None
    institution: Optional[str] = None
    source: Optional[str] = "profile"  # "profile" | "cv" - lets the UI show provenance


class TargetCompany(BaseModel):
    name: str
    tier: Optional[str] = "preferred"  # "dream" | "high_priority" | "preferred" | "monitor"


class UserProfile(BaseModel):
    industry: Optional[str] = None
    skills: Optional[List[str]] = []
    roles: Optional[List[str]] = []
    experience_level: Optional[str] = None
    years_experience: Optional[float] = None
    education: Optional[List[EducationEntry]] = []
    certifications: Optional[List[str]] = []
    projects: Optional[List[str]] = []
    salary_expectation: Optional[str] = None
    work_authorization: Optional[str] = None
    target_companies: Optional[List[TargetCompany]] = []
    location: Optional[str] = "Remote"
    job_type: Optional[str] = "Full-time"


class MatchSourceUpdate(BaseModel):
    match_source: str


class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    current_password: str


class DeleteAccountRequest(BaseModel):
    current_password: str


class AlertsPauseUpdate(BaseModel):
    paused: bool
