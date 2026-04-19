from pydantic import BaseModel, EmailStr
from typing import List, Optional


class UserSignup(BaseModel):
    email: EmailStr
    password: str
    keywords: List[str]
    location: Optional[str] = "remote"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    keywords: Optional[List[str]] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    plan: Optional[str] = None
