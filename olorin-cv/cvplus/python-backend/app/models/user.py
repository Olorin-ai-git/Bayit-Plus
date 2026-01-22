"""
User Document Models
MongoDB models for user accounts
"""

from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field, EmailStr
from pymongo import IndexModel, ASCENDING, DESCENDING


class User(Document):
    """User account"""

    # Authentication
    email: Indexed(EmailStr, unique=True)
    password_hash: str
    firebase_uid: Optional[str] = None  # For Firebase Auth integration

    # Profile information
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None

    # Account status
    is_active: bool = True
    is_verified: bool = False
    is_premium: bool = False
    role: str = "user"  # user, admin

    # Subscription
    subscription_tier: str = "free"  # free, pro, enterprise
    subscription_expires_at: Optional[datetime] = None

    # Usage limits
    cvs_created: int = 0
    profiles_created: int = 0
    analyses_used: int = 0

    # Preferences
    language: str = "en"
    timezone: str = "UTC"
    email_notifications: bool = True

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("firebase_uid", ASCENDING)], sparse=True),
            IndexModel([("is_active", ASCENDING)]),
            IndexModel(
                [("subscription_tier", ASCENDING), ("created_at", DESCENDING)],
                name="idx_subscription_tier_created"
            ),
            IndexModel(
                [("role", ASCENDING), ("is_active", ASCENDING)],
                name="idx_role_active"
            ),
        ]
