from pydantic import BaseModel, EmailStr
from typing import List, Optional


class UserSignup(BaseModel):
    username: str
    email: EmailStr
    contact: str
    password: str
    keywords: Optional[List[str]] = []
    location: Optional[str] = "remote"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    keywords: Optional[List[str]] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    plan: Optional[str] = None
