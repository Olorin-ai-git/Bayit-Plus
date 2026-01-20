"""
B2B Partner Organization Models.

MongoDB models for partner organizations, users, and API keys.
Extends the IntegrationPartner model from Bayit+ with multi-user and
organization hierarchy support.

SYSTEM MANDATE Compliance:
- No hardcoded values: All enums and defaults configurable
- Complete implementation: No placeholders or TODOs
- Configuration-driven: All values from models or config
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from bson import ObjectId as BsonObjectId
from pydantic import BaseModel, EmailStr, Field, field_validator


class PyObjectId(BsonObjectId):
    """Custom ObjectId type for Pydantic compatibility."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _info=None):
        if not BsonObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return BsonObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _core_schema, handler):
        return {"type": "string"}


class PartnerRole(str, Enum):
    """Partner user roles within an organization."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class ServiceCategory(str, Enum):
    """Available service categories for B2B partners."""

    FRAUD_DETECTION = "fraud_detection"
    CONTENT_AI = "content_ai"


class CapabilityType(str, Enum):
    """Specific capabilities within service categories."""

    # Fraud Detection capabilities
    RISK_ASSESSMENT = "risk_assessment"
    ANOMALY_DETECTION = "anomaly_detection"
    INVESTIGATION_API = "investigation_api"
    LLM_ANALYSIS = "llm_analysis"

    # Content AI capabilities (from Bayit+)
    REALTIME_DUBBING = "realtime_dubbing"
    SEMANTIC_SEARCH = "semantic_search"
    CULTURAL_CONTEXT = "cultural_context"
    RECAP_AGENT = "recap_agent"


class RateLimitConfig(BaseModel):
    """Rate limit configuration for a capability."""

    requests_per_minute: int = Field(default=60, ge=1)
    requests_per_hour: int = Field(default=1000, ge=1)
    requests_per_day: int = Field(default=10000, ge=1)
    concurrent_requests: int = Field(default=10, ge=1)
    max_payload_size_mb: int = Field(default=10, ge=1)


class CapabilityConfig(BaseModel):
    """Configuration for a specific capability."""

    enabled: bool = True
    rate_limits: RateLimitConfig = Field(default_factory=RateLimitConfig)
    custom_settings: Dict[str, Any] = Field(default_factory=dict)


class WebhookConfig(BaseModel):
    """Webhook configuration for partner notifications."""

    url: Optional[str] = None
    secret: Optional[str] = None
    events: List[str] = Field(default_factory=list)
    retry_count: int = Field(default=3, ge=0, le=10)
    timeout_seconds: int = Field(default=30, ge=5, le=120)


class PartnerOrganization(BaseModel):
    """
    B2B Partner organization model.

    Extends IntegrationPartner with multi-user support and organization hierarchy.
    Stores in MongoDB collection: b2b_partner_organizations
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    # Organization identification
    org_id: str = Field(..., min_length=1, max_length=255, description="Unique org identifier")
    partner_id: str = Field(..., min_length=1, max_length=255, description="Link to IntegrationPartner")

    # Display information
    name: str = Field(..., min_length=1, max_length=500, description="Display name")
    name_en: Optional[str] = Field(default=None, max_length=500, description="English name")
    description: Optional[str] = Field(default=None, max_length=2000)
    logo_url: Optional[str] = Field(default=None)
    website_url: Optional[str] = Field(default=None)

    # Organization hierarchy
    parent_org_id: Optional[str] = Field(default=None, description="For enterprise sub-accounts")

    # Contact information
    contact_email: EmailStr = Field(..., description="Primary contact email")
    contact_name: Optional[str] = Field(default=None, max_length=255)
    technical_contact_email: Optional[EmailStr] = Field(default=None)

    # Billing integration (Stripe)
    stripe_customer_id: Optional[str] = Field(default=None)
    billing_email: Optional[EmailStr] = Field(default=None)
    tax_id: Optional[str] = Field(default=None, max_length=50)
    billing_address: Optional[Dict[str, str]] = Field(default=None)

    # Enabled service categories
    enabled_categories: List[ServiceCategory] = Field(default_factory=list)

    # Capability configurations (granular control)
    capabilities: Dict[str, CapabilityConfig] = Field(default_factory=dict)

    # Webhooks
    webhook_config: Optional[WebhookConfig] = Field(default=None)

    # Status
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    suspended_at: Optional[datetime] = Field(default=None)
    suspension_reason: Optional[str] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active_at: Optional[datetime] = Field(default=None)

    # Version for optimistic locking
    version: int = Field(default=1, ge=1)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }

    def has_category(self, category: ServiceCategory) -> bool:
        """Check if organization has a service category enabled."""
        return category in self.enabled_categories and self.is_active

    def has_capability(self, capability: str) -> bool:
        """Check if organization has a specific capability enabled."""
        config = self.capabilities.get(capability)
        return config is not None and config.enabled and self.is_active

    def get_capability_config(self, capability: str) -> Optional[CapabilityConfig]:
        """Get configuration for a specific capability."""
        return self.capabilities.get(capability)

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary for API responses."""
        return {
            "org_id": self.org_id,
            "partner_id": self.partner_id,
            "name": self.name,
            "name_en": self.name_en,
            "description": self.description,
            "logo_url": self.logo_url,
            "website_url": self.website_url,
            "parent_org_id": self.parent_org_id,
            "contact_email": self.contact_email,
            "contact_name": self.contact_name,
            "enabled_categories": [c.value for c in self.enabled_categories],
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_mongodb_dict(self) -> Dict[str, Any]:
        """Convert model to MongoDB document format."""
        doc = self.model_dump(by_alias=True, exclude_unset=True)

        # Convert enums to strings
        if "enabled_categories" in doc:
            doc["enabled_categories"] = [c.value if hasattr(c, "value") else c for c in doc["enabled_categories"]]

        return doc

    @classmethod
    def from_mongodb_dict(cls, doc: Dict[str, Any]) -> "PartnerOrganization":
        """Create instance from MongoDB document."""
        if "_id" in doc and doc["_id"]:
            doc["_id"] = PyObjectId(doc["_id"])

        # Convert string categories back to enums
        if "enabled_categories" in doc:
            doc["enabled_categories"] = [
                ServiceCategory(c) if isinstance(c, str) else c for c in doc["enabled_categories"]
            ]

        return cls(**doc)


class PartnerUser(BaseModel):
    """
    Dashboard user within a partner organization.

    Stores in MongoDB collection: b2b_partner_users
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    # User identification
    user_id: str = Field(..., min_length=1, max_length=255)
    org_id: str = Field(..., min_length=1, max_length=255)

    # User information
    email: EmailStr = Field(...)
    name: str = Field(..., min_length=1, max_length=255)
    password_hash: str = Field(..., min_length=1)

    # Role and permissions
    role: PartnerRole = Field(default=PartnerRole.MEMBER)
    permissions: List[str] = Field(default_factory=list)

    # MFA
    mfa_enabled: bool = Field(default=False)
    mfa_secret: Optional[str] = Field(default=None)
    backup_codes: List[str] = Field(default_factory=list)

    # Session management
    last_login_at: Optional[datetime] = Field(default=None)
    last_login_ip: Optional[str] = Field(default=None)
    failed_login_attempts: int = Field(default=0, ge=0)
    locked_until: Optional[datetime] = Field(default=None)

    # Status
    is_active: bool = Field(default=True)
    email_verified: bool = Field(default=False)
    email_verification_token: Optional[str] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }

    def is_owner(self) -> bool:
        """Check if user is organization owner."""
        return self.role == PartnerRole.OWNER

    def is_admin(self) -> bool:
        """Check if user is admin or owner."""
        return self.role in [PartnerRole.OWNER, PartnerRole.ADMIN]

    def can_manage_users(self) -> bool:
        """Check if user can manage other users."""
        return self.is_admin()

    def can_manage_billing(self) -> bool:
        """Check if user can manage billing."""
        return self.role in [PartnerRole.OWNER, PartnerRole.ADMIN]

    def can_view_usage(self) -> bool:
        """Check if user can view usage analytics."""
        return self.is_active

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses (excludes sensitive fields)."""
        return {
            "user_id": self.user_id,
            "org_id": self.org_id,
            "email": self.email,
            "name": self.name,
            "role": self.role.value,
            "mfa_enabled": self.mfa_enabled,
            "is_active": self.is_active,
            "email_verified": self.email_verified,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PartnerApiKey(BaseModel):
    """
    API key for programmatic access to B2B APIs.

    Stores in MongoDB collection: b2b_partner_api_keys
    """

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    # Key identification
    key_id: str = Field(..., min_length=1, max_length=255)
    org_id: str = Field(..., min_length=1, max_length=255)
    created_by_user_id: str = Field(..., min_length=1, max_length=255)

    # Key data
    name: str = Field(..., min_length=1, max_length=255, description="Human-readable name")
    key_hash: str = Field(..., description="bcrypt hash of the API key")
    key_prefix: str = Field(..., min_length=8, max_length=12, description="First 8-12 chars for lookup")

    # Permissions
    scopes: List[str] = Field(default_factory=list, description="API scopes this key can access")
    allowed_ips: List[str] = Field(default_factory=list, description="IP allowlist (empty = all)")

    # Rate limits (override org defaults if set)
    rate_limit_override: Optional[RateLimitConfig] = Field(default=None)

    # Status
    is_active: bool = Field(default=True)
    expires_at: Optional[datetime] = Field(default=None)
    last_used_at: Optional[datetime] = Field(default=None)
    last_used_ip: Optional[str] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    revoked_at: Optional[datetime] = Field(default=None)
    revoked_by_user_id: Optional[str] = Field(default=None)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            BsonObjectId: str,
            datetime: lambda v: v.isoformat(),
        }

    def is_valid(self) -> bool:
        """Check if key is valid for use."""
        if not self.is_active:
            return False
        if self.revoked_at is not None:
            return False
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False
        return True

    def is_ip_allowed(self, ip: str) -> bool:
        """Check if IP is allowed to use this key."""
        if not self.allowed_ips:
            return True
        return ip in self.allowed_ips

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "key_id": self.key_id,
            "org_id": self.org_id,
            "name": self.name,
            "key_prefix": self.key_prefix,
            "scopes": self.scopes,
            "is_active": self.is_active,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "created_by_user_id": self.created_by_user_id,
        }
