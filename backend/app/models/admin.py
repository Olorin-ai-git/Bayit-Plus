"""
Admin Models
MongoDB document models for admin functionality
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from beanie import Document
from pydantic import BaseModel, Field


# ============ ENUMS ============

class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    CONTENT_MANAGER = "content_manager"
    BILLING_ADMIN = "billing_admin"
    SUPPORT = "support"
    USER = "user"


class Permission(str, Enum):
    USERS_READ = "users:read"
    USERS_CREATE = "users:create"
    USERS_UPDATE = "users:update"
    USERS_DELETE = "users:delete"
    CONTENT_READ = "content:read"
    CONTENT_CREATE = "content:create"
    CONTENT_UPDATE = "content:update"
    CONTENT_DELETE = "content:delete"
    CAMPAIGNS_READ = "campaigns:read"
    CAMPAIGNS_CREATE = "campaigns:create"
    CAMPAIGNS_UPDATE = "campaigns:update"
    CAMPAIGNS_DELETE = "campaigns:delete"
    BILLING_READ = "billing:read"
    BILLING_REFUND = "billing:refund"
    BILLING_EXPORT = "billing:export"
    SUBSCRIPTIONS_READ = "subscriptions:read"
    SUBSCRIPTIONS_UPDATE = "subscriptions:update"
    SUBSCRIPTIONS_CANCEL = "subscriptions:cancel"
    MARKETING_READ = "marketing:read"
    MARKETING_CREATE = "marketing:create"
    MARKETING_SEND = "marketing:send"
    ANALYTICS_READ = "analytics:read"
    ANALYTICS_EXPORT = "analytics:export"
    SYSTEM_CONFIG = "system:config"
    SYSTEM_LOGS = "system:logs"


ROLE_PERMISSIONS: Dict[Role, List[Permission]] = {
    Role.SUPER_ADMIN: list(Permission),
    Role.ADMIN: [
        Permission.USERS_READ, Permission.USERS_CREATE, Permission.USERS_UPDATE,
        Permission.CONTENT_READ, Permission.CONTENT_CREATE, Permission.CONTENT_UPDATE, Permission.CONTENT_DELETE,
        Permission.CAMPAIGNS_READ, Permission.CAMPAIGNS_CREATE, Permission.CAMPAIGNS_UPDATE, Permission.CAMPAIGNS_DELETE,
        Permission.BILLING_READ, Permission.BILLING_REFUND, Permission.BILLING_EXPORT,
        Permission.SUBSCRIPTIONS_READ, Permission.SUBSCRIPTIONS_UPDATE, Permission.SUBSCRIPTIONS_CANCEL,
        Permission.MARKETING_READ, Permission.MARKETING_CREATE, Permission.MARKETING_SEND,
        Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT,
        Permission.SYSTEM_LOGS,
    ],
    Role.CONTENT_MANAGER: [
        Permission.CONTENT_READ, Permission.CONTENT_CREATE, Permission.CONTENT_UPDATE, Permission.CONTENT_DELETE,
        Permission.CAMPAIGNS_READ, Permission.CAMPAIGNS_CREATE, Permission.CAMPAIGNS_UPDATE,
        Permission.ANALYTICS_READ,
    ],
    Role.BILLING_ADMIN: [
        Permission.USERS_READ,
        Permission.BILLING_READ, Permission.BILLING_REFUND, Permission.BILLING_EXPORT,
        Permission.SUBSCRIPTIONS_READ, Permission.SUBSCRIPTIONS_UPDATE, Permission.SUBSCRIPTIONS_CANCEL,
        Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT,
    ],
    Role.SUPPORT: [
        Permission.USERS_READ,
        Permission.CONTENT_READ,
        Permission.BILLING_READ,
        Permission.SUBSCRIPTIONS_READ,
        Permission.ANALYTICS_READ,
    ],
    Role.USER: [],
}


# ============ CAMPAIGN ============

class CampaignType(str, Enum):
    PROMOTIONAL = "promotional"
    DISCOUNT = "discount"
    TRIAL = "trial"
    REFERRAL = "referral"


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    SCHEDULED = "scheduled"
    ENDED = "ended"
    PAUSED = "paused"


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    FREE_TRIAL = "free_trial"


class TargetAudience(BaseModel):
    all_users: bool = False
    plans: List[str] = Field(default_factory=list)
    new_users_only: bool = False
    registered_before: Optional[datetime] = None
    registered_after: Optional[datetime] = None


class Campaign(Document):
    name: str
    description: Optional[str] = None
    type: CampaignType
    status: CampaignStatus = CampaignStatus.DRAFT
    start_date: datetime
    end_date: Optional[datetime] = None
    promo_code: Optional[str] = None
    discount_type: DiscountType
    discount_value: float
    usage_limit: Optional[int] = None
    usage_count: int = 0
    target_audience: TargetAudience = Field(default_factory=TargetAudience)
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "campaigns"
        indexes = ["promo_code", "status", "created_by"]


# ============ TRANSACTION ============

class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    CARD = "card"
    PAYPAL = "paypal"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"


class Transaction(Document):
    user_id: str
    subscription_id: Optional[str] = None
    amount: float
    currency: str = "USD"
    payment_method: PaymentMethod
    status: TransactionStatus
    stripe_payment_intent_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "transactions"
        indexes = ["user_id", "status", "created_at"]


# ============ REFUND ============

class RefundStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSED = "processed"
    REJECTED = "rejected"


class Refund(Document):
    transaction_id: str
    user_id: str
    amount: float
    reason: str
    status: RefundStatus = RefundStatus.PENDING
    processed_by: Optional[str] = None
    processed_at: Optional[datetime] = None
    stripe_refund_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "refunds"
        indexes = ["transaction_id", "user_id", "status"]


# ============ AUDIT LOG ============

class AuditAction(str, Enum):
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_ROLE_CHANGED = "user_role_changed"
    CAMPAIGN_CREATED = "campaign_created"
    CAMPAIGN_UPDATED = "campaign_updated"
    CAMPAIGN_DELETED = "campaign_deleted"
    CAMPAIGN_ACTIVATED = "campaign_activated"
    SUBSCRIPTION_CREATED = "subscription_created"
    SUBSCRIPTION_UPDATED = "subscription_updated"
    SUBSCRIPTION_CANCELED = "subscription_canceled"
    REFUND_PROCESSED = "refund_processed"
    PAYMENT_RECEIVED = "payment_received"
    SETTINGS_UPDATED = "settings_updated"
    LOGIN = "login"
    LOGOUT = "logout"
    # Content Management
    CONTENT_CREATED = "content_created"
    CONTENT_UPDATED = "content_updated"
    CONTENT_DELETED = "content_deleted"
    CONTENT_PUBLISHED = "content_published"
    CONTENT_UNPUBLISHED = "content_unpublished"
    CATEGORY_CREATED = "category_created"
    CATEGORY_UPDATED = "category_updated"
    CATEGORY_DELETED = "category_deleted"
    LIVE_CHANNEL_CREATED = "live_channel_created"
    LIVE_CHANNEL_UPDATED = "live_channel_updated"
    LIVE_CHANNEL_DELETED = "live_channel_deleted"
    RADIO_STATION_CREATED = "radio_station_created"
    RADIO_STATION_UPDATED = "radio_station_updated"
    RADIO_STATION_DELETED = "radio_station_deleted"
    PODCAST_CREATED = "podcast_created"
    PODCAST_UPDATED = "podcast_updated"
    PODCAST_DELETED = "podcast_deleted"
    PODCAST_EPISODE_CREATED = "podcast_episode_created"
    PODCAST_EPISODE_UPDATED = "podcast_episode_updated"
    PODCAST_EPISODE_DELETED = "podcast_episode_deleted"
    CONTENT_IMPORTED = "content_imported"
    # Widget Management
    WIDGET_CREATED = "widget_created"
    WIDGET_UPDATED = "widget_updated"
    WIDGET_DELETED = "widget_deleted"
    WIDGET_PUBLISHED = "widget_published"
    WIDGET_UNPUBLISHED = "widget_unpublished"


class AuditLog(Document):
    user_id: str
    action: AuditAction
    resource_type: str
    resource_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audit_logs"
        indexes = ["user_id", "action", "resource_type", "created_at"]


# ============ EMAIL CAMPAIGN ============

class MarketingStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"


class AudienceFilter(BaseModel):
    all_users: bool = False
    plans: List[str] = Field(default_factory=list)
    active_only: bool = True
    inactive_days: Optional[int] = None
    registered_before: Optional[datetime] = None
    registered_after: Optional[datetime] = None
    segment: Optional[str] = None


class EmailCampaign(Document):
    name: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    audience_filter: AudienceFilter = Field(default_factory=AudienceFilter)
    status: MarketingStatus = MarketingStatus.DRAFT
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    sent_count: int = 0
    open_count: int = 0
    click_count: int = 0
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "email_campaigns"
        indexes = ["status", "created_by", "created_at"]


# ============ PUSH NOTIFICATION ============

class PushNotification(Document):
    title: str
    body: str
    image_url: Optional[str] = None
    deep_link: Optional[str] = None
    audience_filter: AudienceFilter = Field(default_factory=AudienceFilter)
    status: MarketingStatus = MarketingStatus.DRAFT
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    sent_count: int = 0
    open_count: int = 0
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "push_notifications"
        indexes = ["status", "created_by", "created_at"]


# ============ SYSTEM SETTINGS ============

class SystemSettings(Document):
    key: str  # Singleton key = "system_settings"
    default_plan: str = "free"
    trial_days: int = 7
    max_devices: int = 4
    maintenance_mode: bool = False
    support_email: str = "support@bayit.tv"
    terms_url: str = "https://bayit.tv/terms"
    privacy_url: str = "https://bayit.tv/privacy"
    feature_flags: Dict[str, bool] = Field(default_factory=lambda: {
        "new_player": True,
        "dark_mode": True,
        "offline_mode": False,
        "recommendations": True,
        "social_features": False,
        "live_chat": True,
        "analytics_v2": False,
    })
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None

    class Settings:
        name = "system_settings"


# ============ SUBSCRIPTION PLAN ============

class SubscriptionPlan(Document):
    name: str
    slug: str  # basic, premium, family
    price: float
    currency: str = "USD"
    interval: str = "monthly"  # monthly, yearly
    trial_days: int = 0
    features: List[str] = Field(default_factory=list)
    max_devices: int = 1
    is_active: bool = True
    stripe_price_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "subscription_plans"
        indexes = ["slug", "is_active"]
