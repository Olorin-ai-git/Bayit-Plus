from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    name: str
    is_active: bool = True
    is_admin: bool = False


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    is_active: bool
    subscription: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class User(Document):
    email: EmailStr
    name: str
    hashed_password: str
    is_active: bool = True
    is_admin: bool = False

    # Subscription info
    subscription_id: Optional[str] = None
    subscription_tier: Optional[str] = None  # basic, premium, family
    subscription_status: Optional[str] = None  # active, canceled, past_due
    subscription_end_date: Optional[datetime] = None

    # Stripe customer
    stripe_customer_id: Optional[str] = None

    # User preferences
    preferred_language: str = "he"
    notification_settings: dict = Field(default_factory=lambda: {
        "new_content": True,
        "live_events": True,
        "recommendations": True,
        "updates": True,
    })

    # Device management
    devices: List[dict] = Field(default_factory=list)
    max_concurrent_streams: int = 1

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    class Settings:
        name = "users"
        indexes = [
            "email",
            "stripe_customer_id",
        ]

    def to_response(self) -> UserResponse:
        subscription = None
        if self.subscription_tier:
            subscription = {
                "plan": self.subscription_tier,
                "status": self.subscription_status,
                "end_date": self.subscription_end_date.isoformat() if self.subscription_end_date else None,
            }
        return UserResponse(
            id=str(self.id),
            email=self.email,
            name=self.name,
            is_active=self.is_active,
            subscription=subscription,
            created_at=self.created_at,
        )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
