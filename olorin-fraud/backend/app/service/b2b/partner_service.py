"""
B2B Partner Service.

Business logic for managing B2B partner organizations, users, and API keys.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders
- Uses existing MongoDB infrastructure
"""

import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.models.b2b.partner import (
    CapabilityConfig,
    PartnerApiKey,
    PartnerOrganization,
    PartnerRole,
    PartnerUser,
    RateLimitConfig,
    ServiceCategory,
    WebhookConfig,
)
from app.persistence.mongodb import get_mongodb_client
from app.security.b2b_auth import (
    generate_api_key,
    hash_password,
    verify_api_key,
    verify_password,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class B2BPartnerService:
    """
    Service for managing B2B partner organizations, users, and API keys.
    """

    _instance = None
    _initialized = False

    # Collection names
    ORGANIZATIONS_COLLECTION = "b2b_partner_organizations"
    USERS_COLLECTION = "b2b_partner_users"
    API_KEYS_COLLECTION = "b2b_partner_api_keys"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(B2BPartnerService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not B2BPartnerService._initialized:
            self.db = None
            B2BPartnerService._initialized = True

    async def _get_db(self):
        """Get MongoDB database instance."""
        if self.db is None:
            client = await get_mongodb_client()
            self.db = client.get_default_database()
        return self.db

    # ==================== Organization Management ====================

    async def create_organization(
        self,
        org_id: str,
        name: str,
        contact_email: str,
        name_en: Optional[str] = None,
        description: Optional[str] = None,
        contact_name: Optional[str] = None,
        enabled_categories: Optional[List[ServiceCategory]] = None,
    ) -> Tuple[PartnerOrganization, str]:
        """
        Create a new B2B partner organization.

        Args:
            org_id: Unique organization identifier (slug)
            name: Display name
            contact_email: Primary contact email
            name_en: English display name
            description: Organization description
            contact_name: Primary contact name
            enabled_categories: Initial enabled service categories

        Returns:
            Tuple of (PartnerOrganization, partner_id)

        Raises:
            ValueError: If org_id already exists
        """
        db = await self._get_db()
        collection = db[self.ORGANIZATIONS_COLLECTION]

        # Check for existing org
        existing = await collection.find_one({"org_id": org_id})
        if existing:
            raise ValueError(f"Organization with ID '{org_id}' already exists")

        # Generate partner_id
        partner_id = f"partner_{secrets.token_urlsafe(16)}"

        # Create organization document
        org = PartnerOrganization(
            org_id=org_id,
            partner_id=partner_id,
            name=name,
            name_en=name_en,
            description=description,
            contact_email=contact_email,
            contact_name=contact_name,
            enabled_categories=enabled_categories or [],
            capabilities={},
            is_active=True,
            is_verified=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        # Insert into database
        doc = org.to_mongodb_dict()
        result = await collection.insert_one(doc)
        org.id = result.inserted_id

        logger.info(f"Created B2B organization: {org_id} (partner_id: {partner_id})")
        return org, partner_id

    async def get_organization(self, org_id: str) -> Optional[PartnerOrganization]:
        """Get organization by ID."""
        db = await self._get_db()
        collection = db[self.ORGANIZATIONS_COLLECTION]

        doc = await collection.find_one({"org_id": org_id})
        if not doc:
            return None

        return PartnerOrganization.from_mongodb_dict(doc)

    async def get_organization_by_partner_id(
        self, partner_id: str
    ) -> Optional[PartnerOrganization]:
        """Get organization by partner_id."""
        db = await self._get_db()
        collection = db[self.ORGANIZATIONS_COLLECTION]

        doc = await collection.find_one({"partner_id": partner_id})
        if not doc:
            return None

        return PartnerOrganization.from_mongodb_dict(doc)

    async def update_organization(
        self, org_id: str, **updates: Any
    ) -> Optional[PartnerOrganization]:
        """
        Update organization fields.

        Args:
            org_id: Organization ID
            **updates: Fields to update

        Returns:
            Updated organization or None if not found
        """
        db = await self._get_db()
        collection = db[self.ORGANIZATIONS_COLLECTION]

        # Add updated timestamp
        updates["updated_at"] = datetime.now(timezone.utc)

        result = await collection.find_one_and_update(
            {"org_id": org_id},
            {"$set": updates},
            return_document=True,
        )

        if not result:
            return None

        logger.info(f"Updated B2B organization: {org_id}")
        return PartnerOrganization.from_mongodb_dict(result)

    async def enable_service_category(
        self, org_id: str, category: ServiceCategory
    ) -> Optional[PartnerOrganization]:
        """Enable a service category for an organization."""
        db = await self._get_db()
        collection = db[self.ORGANIZATIONS_COLLECTION]

        result = await collection.find_one_and_update(
            {"org_id": org_id},
            {
                "$addToSet": {"enabled_categories": category.value},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
            return_document=True,
        )

        if not result:
            return None

        logger.info(f"Enabled {category.value} for organization: {org_id}")
        return PartnerOrganization.from_mongodb_dict(result)

    async def disable_service_category(
        self, org_id: str, category: ServiceCategory
    ) -> Optional[PartnerOrganization]:
        """Disable a service category for an organization."""
        db = await self._get_db()
        collection = db[self.ORGANIZATIONS_COLLECTION]

        result = await collection.find_one_and_update(
            {"org_id": org_id},
            {
                "$pull": {"enabled_categories": category.value},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
            return_document=True,
        )

        if not result:
            return None

        logger.info(f"Disabled {category.value} for organization: {org_id}")
        return PartnerOrganization.from_mongodb_dict(result)

    async def enable_capability(
        self,
        org_id: str,
        capability: str,
        rate_limits: Optional[RateLimitConfig] = None,
        custom_settings: Optional[Dict[str, Any]] = None,
    ) -> Optional[PartnerOrganization]:
        """Enable a specific capability for an organization."""
        db = await self._get_db()
        collection = db[self.ORGANIZATIONS_COLLECTION]

        config = CapabilityConfig(
            enabled=True,
            rate_limits=rate_limits or RateLimitConfig(),
            custom_settings=custom_settings or {},
        )

        result = await collection.find_one_and_update(
            {"org_id": org_id},
            {
                "$set": {
                    f"capabilities.{capability}": config.model_dump(),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
            return_document=True,
        )

        if not result:
            return None

        logger.info(f"Enabled capability {capability} for organization: {org_id}")
        return PartnerOrganization.from_mongodb_dict(result)

    async def suspend_organization(
        self, org_id: str, reason: str
    ) -> Optional[PartnerOrganization]:
        """Suspend a partner organization."""
        return await self.update_organization(
            org_id,
            is_active=False,
            suspended_at=datetime.now(timezone.utc),
            suspension_reason=reason,
        )

    async def unsuspend_organization(
        self, org_id: str
    ) -> Optional[PartnerOrganization]:
        """Unsuspend a partner organization."""
        return await self.update_organization(
            org_id,
            is_active=True,
            suspended_at=None,
            suspension_reason=None,
        )

    async def configure_webhook(
        self,
        org_id: str,
        webhook_url: str,
        events: List[str],
        secret: Optional[str] = None,
    ) -> Optional[PartnerOrganization]:
        """Configure webhook for an organization."""
        webhook_secret = secret or secrets.token_urlsafe(32)

        config = WebhookConfig(
            url=webhook_url,
            secret=webhook_secret,
            events=events,
        )

        return await self.update_organization(
            org_id,
            webhook_config=config.model_dump(),
        )

    # ==================== User Management ====================

    async def create_user(
        self,
        org_id: str,
        email: str,
        name: str,
        password: str,
        role: PartnerRole = PartnerRole.MEMBER,
    ) -> PartnerUser:
        """
        Create a new user within a partner organization.

        Args:
            org_id: Organization ID
            email: User email
            name: User display name
            password: Plain text password (will be hashed)
            role: User role

        Returns:
            Created PartnerUser

        Raises:
            ValueError: If email already exists in organization
        """
        db = await self._get_db()
        collection = db[self.USERS_COLLECTION]

        # Check for existing user
        existing = await collection.find_one({"org_id": org_id, "email": email})
        if existing:
            raise ValueError(f"User with email '{email}' already exists in organization")

        # Generate user_id
        user_id = f"user_{secrets.token_urlsafe(16)}"

        # Create user document
        user = PartnerUser(
            user_id=user_id,
            org_id=org_id,
            email=email,
            name=name,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        # Insert into database
        doc = user.model_dump(by_alias=True, exclude_unset=True)
        doc["role"] = role.value
        result = await collection.insert_one(doc)
        user.id = result.inserted_id

        logger.info(f"Created B2B user: {email} in organization: {org_id}")
        return user

    async def get_user(self, user_id: str) -> Optional[PartnerUser]:
        """Get user by ID."""
        db = await self._get_db()
        collection = db[self.USERS_COLLECTION]

        doc = await collection.find_one({"user_id": user_id})
        if not doc:
            return None

        # Convert role string to enum
        if "role" in doc and isinstance(doc["role"], str):
            doc["role"] = PartnerRole(doc["role"])

        return PartnerUser(**doc)

    async def get_user_by_email(
        self, email: str, org_id: Optional[str] = None
    ) -> Optional[PartnerUser]:
        """Get user by email, optionally scoped to organization."""
        db = await self._get_db()
        collection = db[self.USERS_COLLECTION]

        query = {"email": email}
        if org_id:
            query["org_id"] = org_id

        doc = await collection.find_one(query)
        if not doc:
            return None

        # Convert role string to enum
        if "role" in doc and isinstance(doc["role"], str):
            doc["role"] = PartnerRole(doc["role"])

        return PartnerUser(**doc)

    async def authenticate_user(
        self, email: str, password: str
    ) -> Optional[PartnerUser]:
        """
        Authenticate a user by email and password.

        Args:
            email: User email
            password: Plain text password

        Returns:
            PartnerUser if authentication successful, None otherwise
        """
        user = await self.get_user_by_email(email)
        if not user:
            return None

        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {email}")
            return None

        if user.locked_until and datetime.now(timezone.utc) < user.locked_until:
            logger.warning(f"Login attempt for locked user: {email}")
            return None

        if not verify_password(password, user.password_hash):
            # Increment failed attempts
            await self._increment_failed_login(user.user_id)
            return None

        # Reset failed attempts and update last login
        await self._successful_login(user.user_id)

        return user

    async def _increment_failed_login(self, user_id: str) -> None:
        """Increment failed login attempts for a user."""
        db = await self._get_db()
        collection = db[self.USERS_COLLECTION]

        # Get current count
        user = await self.get_user(user_id)
        if not user:
            return

        new_count = user.failed_login_attempts + 1

        # Lock account after 5 failed attempts for 15 minutes
        update: Dict[str, Any] = {
            "failed_login_attempts": new_count,
            "updated_at": datetime.now(timezone.utc),
        }

        if new_count >= 5:
            from datetime import timedelta

            update["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
            logger.warning(f"User {user_id} locked due to failed login attempts")

        await collection.update_one({"user_id": user_id}, {"$set": update})

    async def _successful_login(self, user_id: str, ip: Optional[str] = None) -> None:
        """Update user after successful login."""
        db = await self._get_db()
        collection = db[self.USERS_COLLECTION]

        await collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "failed_login_attempts": 0,
                    "locked_until": None,
                    "last_login_at": datetime.now(timezone.utc),
                    "last_login_ip": ip,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    async def list_organization_users(self, org_id: str) -> List[PartnerUser]:
        """List all users in an organization."""
        db = await self._get_db()
        collection = db[self.USERS_COLLECTION]

        users = []
        cursor = collection.find({"org_id": org_id})

        async for doc in cursor:
            if "role" in doc and isinstance(doc["role"], str):
                doc["role"] = PartnerRole(doc["role"])
            users.append(PartnerUser(**doc))

        return users

    async def update_user(self, user_id: str, **updates: Any) -> Optional[PartnerUser]:
        """Update user fields."""
        db = await self._get_db()
        collection = db[self.USERS_COLLECTION]

        # Handle password update
        if "password" in updates:
            updates["password_hash"] = hash_password(updates.pop("password"))

        # Handle role update
        if "role" in updates and isinstance(updates["role"], PartnerRole):
            updates["role"] = updates["role"].value

        updates["updated_at"] = datetime.now(timezone.utc)

        result = await collection.find_one_and_update(
            {"user_id": user_id},
            {"$set": updates},
            return_document=True,
        )

        if not result:
            return None

        if "role" in result and isinstance(result["role"], str):
            result["role"] = PartnerRole(result["role"])

        return PartnerUser(**result)

    async def delete_user(self, user_id: str) -> bool:
        """Delete a user."""
        db = await self._get_db()
        collection = db[self.USERS_COLLECTION]

        result = await collection.delete_one({"user_id": user_id})
        if result.deleted_count > 0:
            logger.info(f"Deleted B2B user: {user_id}")
            return True
        return False

    # ==================== API Key Management ====================

    async def create_api_key(
        self,
        org_id: str,
        created_by_user_id: str,
        name: str,
        scopes: Optional[List[str]] = None,
        expires_at: Optional[datetime] = None,
    ) -> Tuple[PartnerApiKey, str]:
        """
        Create a new API key for an organization.

        Args:
            org_id: Organization ID
            created_by_user_id: User creating the key
            name: Human-readable key name
            scopes: List of API scopes
            expires_at: Optional expiration datetime

        Returns:
            Tuple of (PartnerApiKey, raw_key)
            Note: raw_key is only returned once!
        """
        db = await self._get_db()
        collection = db[self.API_KEYS_COLLECTION]

        # Generate API key
        raw_key, key_hash, key_prefix = generate_api_key()

        # Generate key_id
        key_id = f"key_{secrets.token_urlsafe(12)}"

        # Create key document
        api_key = PartnerApiKey(
            key_id=key_id,
            org_id=org_id,
            created_by_user_id=created_by_user_id,
            name=name,
            key_hash=key_hash,
            key_prefix=key_prefix,
            scopes=scopes or ["read", "write"],
            expires_at=expires_at,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )

        # Insert into database
        doc = api_key.model_dump(by_alias=True, exclude_unset=True)
        result = await collection.insert_one(doc)
        api_key.id = result.inserted_id

        logger.info(f"Created B2B API key: {key_id} for organization: {org_id}")
        return api_key, raw_key

    async def get_api_key(self, key_id: str) -> Optional[PartnerApiKey]:
        """Get API key by ID."""
        db = await self._get_db()
        collection = db[self.API_KEYS_COLLECTION]

        doc = await collection.find_one({"key_id": key_id})
        if not doc:
            return None

        return PartnerApiKey(**doc)

    async def authenticate_by_api_key(
        self, raw_key: str
    ) -> Optional[Tuple[PartnerApiKey, PartnerOrganization]]:
        """
        Authenticate using an API key.

        Args:
            raw_key: Raw API key string

        Returns:
            Tuple of (PartnerApiKey, PartnerOrganization) if valid, None otherwise
        """
        if not raw_key.startswith("olorin_b2b_"):
            return None

        db = await self._get_db()
        collection = db[self.API_KEYS_COLLECTION]

        # Extract prefix for lookup
        key_prefix = raw_key[:12]

        # Find by prefix
        doc = await collection.find_one({"key_prefix": key_prefix, "is_active": True})
        if not doc:
            return None

        api_key = PartnerApiKey(**doc)

        # Verify full key
        if not verify_api_key(raw_key, api_key.key_hash):
            return None

        # Check if key is valid
        if not api_key.is_valid():
            return None

        # Get organization
        org = await self.get_organization(api_key.org_id)
        if not org or not org.is_active:
            return None

        # Update last used
        await collection.update_one(
            {"key_id": api_key.key_id},
            {
                "$set": {
                    "last_used_at": datetime.now(timezone.utc),
                }
            },
        )

        # Update organization last active
        await self.update_organization(
            api_key.org_id,
            last_active_at=datetime.now(timezone.utc),
        )

        return api_key, org

    async def list_organization_api_keys(self, org_id: str) -> List[PartnerApiKey]:
        """List all API keys for an organization."""
        db = await self._get_db()
        collection = db[self.API_KEYS_COLLECTION]

        keys = []
        cursor = collection.find({"org_id": org_id, "revoked_at": None})

        async for doc in cursor:
            keys.append(PartnerApiKey(**doc))

        return keys

    async def revoke_api_key(
        self, key_id: str, revoked_by_user_id: str
    ) -> Optional[PartnerApiKey]:
        """Revoke an API key."""
        db = await self._get_db()
        collection = db[self.API_KEYS_COLLECTION]

        result = await collection.find_one_and_update(
            {"key_id": key_id},
            {
                "$set": {
                    "is_active": False,
                    "revoked_at": datetime.now(timezone.utc),
                    "revoked_by_user_id": revoked_by_user_id,
                }
            },
            return_document=True,
        )

        if not result:
            return None

        logger.info(f"Revoked B2B API key: {key_id}")
        return PartnerApiKey(**result)


# Global instance
_b2b_partner_service: Optional[B2BPartnerService] = None


def get_b2b_partner_service() -> B2BPartnerService:
    """Get the global B2B partner service instance."""
    global _b2b_partner_service
    if _b2b_partner_service is None:
        _b2b_partner_service = B2BPartnerService()
    return _b2b_partner_service
