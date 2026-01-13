from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    name: str
    is_active: bool = True
    role: str = "user"


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


class UserAdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None
    custom_permissions: Optional[List[str]] = None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    avatar: Optional[str] = None
    is_active: bool
    role: str = "user"
    subscription: Optional[dict] = None
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserAdminResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    is_active: bool
    role: str
    custom_permissions: List[str] = []
    subscription: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    devices: List[dict] = []
    stripe_customer_id: Optional[str] = None

    class Config:
        from_attributes = True


class User(Document):
    email: EmailStr
    name: str
    hashed_password: Optional[str] = None  # Optional for OAuth users
    is_active: bool = True
    role: str = "user"  # super_admin, admin, content_manager, billing_admin, support, viewer, user
    custom_permissions: List[str] = Field(default_factory=list)  # Additional permissions beyond role

    # Profile
    avatar: Optional[str] = None  # URL to user's avatar image

    # OAuth
    google_id: Optional[str] = None
    auth_provider: str = "local"  # local, google

    # Email verification
    email_verified: bool = False
    email_verification_token: Optional[str] = None
    email_verification_sent_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None

    # Phone verification
    phone_number: Optional[str] = None  # E.164 format
    phone_verified: bool = False
    phone_verification_code: Optional[str] = None
    phone_verification_sent_at: Optional[datetime] = None
    phone_verified_at: Optional[datetime] = None

    # Composite verification status
    is_verified: bool = False  # True only when BOTH email AND phone verified (or admin)

    # Rate limiting
    verification_attempts: int = 0
    last_verification_attempt: Optional[datetime] = None

    # Subscription info
    subscription_id: Optional[str] = None
    subscription_tier: Optional[str] = None  # basic, premium, family
    subscription_status: Optional[str] = None  # active, canceled, past_due
    subscription_end_date: Optional[datetime] = None
    subscription_start_date: Optional[datetime] = None

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

    # Extended preferences for new features
    preferences: dict = Field(default_factory=lambda: {
        # Zman Yisrael settings
        "show_israel_time": True,
        "shabbat_mode_enabled": True,
        "local_timezone": "America/New_York",

        # Morning Ritual settings
        "morning_ritual_enabled": False,
        "morning_ritual_start": "07:00",
        "morning_ritual_end": "09:00",
        "morning_ritual_content": "news",  # news, ai_brief, custom

        # Subtitle settings
        "subtitles_enabled": True,
        "nikud_enabled": False,
        "tap_translate_enabled": True,
        "subtitle_language": "he",

        # Layout preferences
        "layout_phone": "vertical",  # vertical, grid
        "layout_tv": "cinematic",  # cinematic, grid

        # Watch party settings
        "auto_join_audio": False,
        "push_to_talk": False,
    })

    # Device management
    devices: List[dict] = Field(default_factory=list)
    max_concurrent_streams: int = 1

    # Profile management
    active_profile_id: Optional[str] = None
    kids_pin: Optional[str] = None  # Master PIN for exiting kids profiles

    # Ban info
    is_banned: bool = False
    ban_reason: Optional[str] = None
    banned_at: Optional[datetime] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    class Settings:
        name = "users"
        indexes = [
            "email",
            "stripe_customer_id",
            "role",
            "email_verification_token",
            "phone_number",
            "is_verified",
        ]

    def to_response(self) -> UserResponse:
        subscription = None
        if self.subscription_tier:
            subscription = {
                "id": self.subscription_id,
                "plan": self.subscription_tier,
                "status": self.subscription_status,
                "start_date": self.subscription_start_date.isoformat() if self.subscription_start_date else None,
                "end_date": self.subscription_end_date.isoformat() if self.subscription_end_date else None,
            }
        return UserResponse(
            id=str(self.id),
            email=self.email,
            name=self.name,
            avatar=self.avatar,
            is_active=self.is_active,
            role=self.role,
            subscription=subscription,
            created_at=self.created_at,
            last_login=self.last_login,
        )

    def to_admin_response(self) -> UserAdminResponse:
        subscription = None
        if self.subscription_tier:
            subscription = {
                "id": self.subscription_id,
                "plan": self.subscription_tier,
                "status": self.subscription_status,
                "start_date": self.subscription_start_date.isoformat() if self.subscription_start_date else None,
                "end_date": self.subscription_end_date.isoformat() if self.subscription_end_date else None,
            }
        return UserAdminResponse(
            id=str(self.id),
            email=self.email,
            name=self.name,
            is_active=self.is_active,
            role=self.role,
            custom_permissions=self.custom_permissions,
            subscription=subscription,
            created_at=self.created_at,
            updated_at=self.updated_at,
            last_login=self.last_login,
            devices=self.devices,
            stripe_customer_id=self.stripe_customer_id,
        )

    def is_admin_user(self) -> bool:
        return self.role in ["super_admin", "admin", "content_manager", "billing_admin", "support"]

    def is_admin_role(self) -> bool:
        """Check if user has admin role (bypasses verification)."""
        return self.is_admin_user()

    def needs_verification(self) -> bool:
        """Check if user needs verification."""
        return not self.is_admin_role() and not self.is_verified

    def can_access_premium_features(self) -> bool:
        """Check if user can access premium features."""
        if self.is_admin_role():
            return True
        return self.subscription_tier in ["premium", "family"]

    def update_verification_status(self) -> None:
        """Update is_verified based on email_verified AND phone_verified."""
        if self.is_admin_role():
            self.is_verified = True
            self.email_verified = True
            self.phone_verified = True
        else:
            self.is_verified = self.email_verified and self.phone_verified


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
