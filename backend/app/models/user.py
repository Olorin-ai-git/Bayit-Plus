import re
from datetime import datetime, timezone
from typing import List, Literal, Optional

from beanie import Document
from pydantic import BaseModel, EmailStr, Field, validator

from app.models.recording import RecordingQuota


class OnboardingTour(BaseModel):
    """Embedded document tracking feature discovery tour state."""

    platform: Optional[str] = None
    tour_version: int = 0
    current_card_index: int = 0
    completion_status: str = "not_started"
    completed_cards: List[str] = Field(default_factory=list)
    demo_cards_tapped: List[str] = Field(default_factory=list)
    language: Optional[str] = None
    preferences: Optional[dict] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    skipped_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Device(BaseModel):
    """
    Represents a registered device for a user.

    Device fingerprinting is based on user agent, screen resolution, and platform.
    Device ID is a SHA-256 hash for uniqueness and privacy.
    """

    device_id: str  # SHA-256 hash of UA+screen+platform
    device_name: str  # e.g., "iPhone 15 Pro", "Chrome on Windows 11"
    device_type: str  # mobile, desktop, tv, tablet
    browser: Optional[str] = None  # Chrome, Safari, Firefox
    os: Optional[str] = None  # iOS 17.2, Windows 11
    platform: Optional[str] = None  # iOS, Android, Web, tvOS
    ip_address: Optional[str] = None
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    registered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_current: bool = False  # Flag for current device

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr
    name: str
    is_active: bool = True
    role: str = "user"


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

    @validator("password")
    def validate_password(cls, v):
        """Enforce strong password requirements"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\|`~]', v):
            raise ValueError("Password must contain at least one special character")
        # Check for common weak passwords
        common_passwords = ["password", "12345678", "qwerty", "abc123", "password123"]
        if v.lower() in common_passwords:
            raise ValueError(
                "This password is too common. Please choose a stronger password"
            )
        return v


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
    # Beta 500 program
    is_beta_user: bool = False
    is_verified: bool = False
    # Payment status fields
    payment_pending: bool = False
    pending_plan_id: Optional[str] = None

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
    devices: List[Device] = []
    stripe_customer_id: Optional[str] = None

    class Config:
        from_attributes = True


class User(Document):
    email: EmailStr
    name: str
    hashed_password: Optional[str] = None  # Optional for OAuth users
    is_active: bool = True
    role: str = (
        "user"  # super_admin, admin, content_manager, billing_admin, support, viewer, user
    )
    custom_permissions: List[str] = Field(
        default_factory=list
    )  # Additional permissions beyond role

    # Profile
    avatar: Optional[str] = None  # URL to user's avatar image

    # Social stats (denormalized for quick access)
    friend_count: int = 0
    games_played: int = 0

    # Privacy settings
    profile_visibility: Literal["public", "friends_only", "private"] = "public"
    allow_friend_requests: bool = True

    # Beta 500 program
    is_beta_user: bool = False

    # OAuth - Multi-provider support
    google_id: Optional[str] = None
    apple_id: Optional[str] = None
    auth_provider: str = "local"  # Primary provider: local, google, apple, olorin_auth
    linked_providers: List[str] = Field(
        default_factory=list
    )  # All linked providers: ["local", "google", "apple", "olorin_auth"]

    # Olorin Auth Service integration
    auth_service_user_id: Optional[str] = None  # User ID from auth.olorin.ai

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

    # Account lockout (brute force protection)
    failed_login_attempts: int = 0
    last_failed_login: Optional[datetime] = None
    account_locked_until: Optional[datetime] = None

    # Password reset
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None

    # MFA / Two-Factor Authentication
    two_factor_enabled: bool = False
    two_factor_secret: Optional[str] = None  # TOTP secret (encrypted)
    two_factor_method: Optional[Literal["totp", "sms"]] = None

    # SMS MFA (separate from phone verification to avoid conflicts)
    mfa_sms_code: Optional[str] = None
    mfa_sms_sent_at: Optional[datetime] = None
    mfa_failed_attempts: int = 0
    mfa_locked_until: Optional[datetime] = None

    # Biometric preference (server-side flag)
    biometric_enabled: bool = False

    # Password tracking
    last_password_change: Optional[datetime] = None

    # Subscription info
    subscription_id: Optional[str] = None
    subscription_tier: Optional[str] = "free"  # free, plus
    subscription_status: Optional[str] = None  # active, canceled, past_due
    subscription_end_date: Optional[datetime] = None
    subscription_start_date: Optional[datetime] = None

    # Stripe customer
    stripe_customer_id: Optional[str] = None

    # ==========================================
    # PAYMENT WORKFLOW FIELDS
    # ==========================================
    payment_pending: bool = False  # Primary payment state indicator
    payment_created_at: Optional[datetime] = None  # For cleanup tracking
    pending_plan_id: Optional[str] = None  # Store selected plan (not URL)

    # User preferences
    preferred_language: str = "he"
    notification_settings: dict = Field(
        default_factory=lambda: {
            "new_content": True,
            "live_events": True,
            "recommendations": True,
            "updates": True,
        }
    )

    # Extended preferences for new features
    preferences: dict = Field(
        default_factory=lambda: {
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
            # Translation settings
            "auto_translate_enabled": True,
            # Culture settings (Global Cultures feature)
            "culture_id": "israeli",  # Default for backward compatibility
            "show_culture_clock": True,  # Show clock for selected culture's timezone
            "culture_cities_enabled": True,  # Show city rows for selected culture
            # Location detection settings
            "detected_location": None,  # { city, state, county, latitude, longitude, timestamp, source }
            "location_permission": "prompt",  # granted, denied, prompt
            "location_consent_given": False,  # GDPR: explicit user consent for location tracking
            "location_consent_timestamp": None,  # When consent was given (ISO datetime)
            "location_data_retention_days": 90,  # User's preference for how long to keep location data
            # Interactive moments (VOD character interactions)
            "interactive_moments_enabled": False,
            # UI element visibility (user-controlled)
            "show_widgets_dock": False,
            "show_voice_control_fab": False,
        }
    )

    # Device management
    devices: List[Device] = Field(default_factory=list)
    max_concurrent_streams: int = 1

    # Recording quota (for premium users)
    recording_quota: RecordingQuota = Field(default_factory=RecordingQuota)

    # Profile management
    active_profile_id: Optional[str] = None
    kids_pin: Optional[str] = None  # Master PIN for exiting kids profiles

    # Onboarding tour state
    onboarding_tour: Optional[OnboardingTour] = None

    # Ban info
    is_banned: bool = False
    ban_reason: Optional[str] = None
    banned_at: Optional[datetime] = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

    class Settings:
        name = "users"
        indexes = [
            # Existing indexes
            "email",
            "stripe_customer_id",
            "role",
            "email_verification_token",
            "phone_number",
            "is_verified",
            # OAuth provider indexes
            "google_id",
            "apple_id",
            # Payment workflow indexes (CRITICAL for performance)
            "payment_pending",  # Access control checks (high frequency)
            [("role", 1), ("subscription_tier", 1)],  # Viewer migration queries
            [("payment_pending", 1), ("payment_created_at", 1)],  # Cleanup queries
            # Beta 500 program
            "is_beta_user",
        ]

    def to_response(self) -> UserResponse:
        if self.is_admin_user():
            subscription = {
                "id": None,
                "plan": "admin",
                "status": "active",
                "start_date": None,
                "end_date": None,
            }
        else:
            tier = self.subscription_tier or "free"
            subscription = {
                "id": self.subscription_id,
                "plan": tier,
                "status": self.subscription_status or "active",
                "start_date": (
                    self.subscription_start_date.isoformat()
                    if self.subscription_start_date
                    else None
                ),
                "end_date": (
                    self.subscription_end_date.isoformat()
                    if self.subscription_end_date
                    else None
                ),
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
            payment_pending=self.payment_pending,
            pending_plan_id=self.pending_plan_id,
            is_beta_user=self.is_beta_user,
            is_verified=self.is_verified,
        )

    def to_admin_response(self) -> UserAdminResponse:
        if self.is_admin_user():
            subscription = {
                "id": None,
                "plan": "admin",
                "status": "active",
                "start_date": None,
                "end_date": None,
            }
        else:
            tier = self.subscription_tier or "free"
            subscription = {
                "id": self.subscription_id,
                "plan": tier,
                "status": self.subscription_status or "active",
                "start_date": (
                    self.subscription_start_date.isoformat()
                    if self.subscription_start_date
                    else None
                ),
                "end_date": (
                    self.subscription_end_date.isoformat()
                    if self.subscription_end_date
                    else None
                ),
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
        return self.role in [
            "super_admin",
            "admin",
            "content_manager",
            "billing_admin",
            "support",
        ]

    def is_admin_role(self) -> bool:
        """Check if user has admin role (bypasses verification)."""
        return self.is_admin_user()

    def needs_verification(self) -> bool:
        """Check if user needs verification."""
        return not self.is_admin_role() and not self.is_verified

    def can_access_premium_features(self) -> bool:
        """Check if user can access Plus-tier features (downloads, 4K)."""
        if self.is_admin_role():
            return True
        return self.subscription_tier == "plus"

    def update_verification_status(self) -> None:
        """Update is_verified based on email_verified AND phone_verified."""
        if self.is_admin_role():
            self.is_verified = True
            self.email_verified = True
            self.phone_verified = True
        else:
            self.is_verified = self.email_verified and self.phone_verified

    def get_concurrent_stream_limit(self) -> int:
        """
        Get the concurrent stream limit based on subscription tier.

        Returns:
            Maximum number of concurrent streams allowed for user's subscription.
            Defaults to 1 (free plan) if no subscription tier is set.
        """
        from app.models.subscription import SUBSCRIPTION_PLANS

        if self.is_admin_role():
            return SUBSCRIPTION_PLANS["plus"].max_streams

        if self.subscription_tier and self.subscription_tier in SUBSCRIPTION_PLANS:
            return SUBSCRIPTION_PLANS[self.subscription_tier].max_streams

        return SUBSCRIPTION_PLANS["free"].max_streams


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    refresh_token: Optional[str] = None  # Optional for backward compatibility
    requires_payment: bool = False  # Signal frontend to redirect to payment
