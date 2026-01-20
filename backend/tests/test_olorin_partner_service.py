"""
Comprehensive Tests for Olorin Partner Service

Tests cover:
- Partner registration and management
- API key authentication
- Capability management
- Rate limiting
- Suspension handling
- Webhook configuration
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.integration_partner import (
    IntegrationPartner,
    UsageRecord,
    RateLimitConfig,
)
from app.services.olorin.partner_service import PartnerService
from app.core.config import settings


# ============================================
# Test Fixtures
# ============================================

@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[f"{settings.MONGODB_DB_NAME}_partner_test"],
        document_models=[IntegrationPartner, UsageRecord]
    )
    yield client
    # Cleanup
    await client.drop_database(f"{settings.MONGODB_DB_NAME}_partner_test")
    client.close()


@pytest_asyncio.fixture
async def partner_service(db_client):
    """Create partner service instance."""
    return PartnerService()


# ============================================
# Partner Registration Tests
# ============================================

@pytest.mark.asyncio
async def test_create_partner(partner_service, db_client):
    """Test creating a new integration partner."""
    partner, api_key = await partner_service.create_partner(
        partner_id="test-partner-001",
        name="Test Partner",
        contact_email="test@example.com",
        capabilities=["realtime_dubbing", "semantic_search"],
    )

    assert partner is not None
    assert partner.partner_id == "test-partner-001"
    assert partner.name == "Test Partner"
    assert partner.contact_email == "test@example.com"
    assert "realtime_dubbing" in partner.capabilities
    assert "semantic_search" in partner.capabilities
    assert api_key is not None
    assert api_key.startswith("olorin_")


@pytest.mark.asyncio
async def test_create_partner_with_english_name(partner_service, db_client):
    """Test creating partner with English name."""
    partner, api_key = await partner_service.create_partner(
        partner_id="test-partner-en",
        name="שותף בדיקה",
        name_en="Test Partner",
        contact_email="test@example.com",
    )

    assert partner.name == "שותף בדיקה"
    assert partner.name_en == "Test Partner"


@pytest.mark.asyncio
async def test_create_partner_with_billing_tier(partner_service, db_client):
    """Test creating partner with specific billing tier."""
    partner, api_key = await partner_service.create_partner(
        partner_id="enterprise-partner",
        name="Enterprise Partner",
        contact_email="enterprise@example.com",
        billing_tier="enterprise",
    )

    assert partner.billing_tier == "enterprise"


@pytest.mark.asyncio
async def test_create_duplicate_partner(partner_service, db_client):
    """Test that duplicate partner IDs are rejected."""
    await partner_service.create_partner(
        partner_id="duplicate-id",
        name="First Partner",
        contact_email="first@example.com",
    )

    # Attempt to create with same ID should fail
    with pytest.raises(ValueError, match="already exists"):
        await partner_service.create_partner(
            partner_id="duplicate-id",
            name="Second Partner",
            contact_email="second@example.com",
        )


# ============================================
# API Key Authentication Tests
# ============================================

@pytest.mark.asyncio
async def test_authenticate_valid_key(partner_service, db_client):
    """Test authentication with valid API key."""
    partner, api_key = await partner_service.create_partner(
        partner_id="auth-test",
        name="Auth Test Partner",
        contact_email="auth@example.com",
    )

    authenticated = await partner_service.authenticate_by_api_key(api_key)

    assert authenticated is not None
    assert authenticated.partner_id == partner.partner_id


@pytest.mark.asyncio
async def test_authenticate_invalid_key(partner_service, db_client):
    """Test authentication with invalid API key."""
    authenticated = await partner_service.authenticate_by_api_key("invalid-api-key-12345")
    assert authenticated is None


@pytest.mark.asyncio
async def test_authenticate_short_key(partner_service, db_client):
    """Test authentication with too short API key."""
    authenticated = await partner_service.authenticate_by_api_key("short")
    assert authenticated is None


@pytest.mark.asyncio
async def test_authenticate_suspended_partner(partner_service, db_client):
    """Test authentication for suspended partner."""
    partner, api_key = await partner_service.create_partner(
        partner_id="suspended-partner",
        name="Suspended Partner",
        contact_email="suspended@example.com",
    )

    # Suspend partner
    await partner_service.suspend_partner(partner.partner_id, "Testing suspension")

    authenticated = await partner_service.authenticate_by_api_key(api_key)
    assert authenticated is None


@pytest.mark.asyncio
async def test_authenticate_inactive_partner(partner_service, db_client):
    """Test authentication for deactivated partner."""
    partner, api_key = await partner_service.create_partner(
        partner_id="inactive-partner",
        name="Inactive Partner",
        contact_email="inactive@example.com",
    )

    # Deactivate partner
    partner.is_active = False
    await partner.save()

    authenticated = await partner_service.authenticate_by_api_key(api_key)
    assert authenticated is None


@pytest.mark.asyncio
async def test_regenerate_api_key(partner_service, db_client):
    """Test regenerating API key."""
    partner, old_key = await partner_service.create_partner(
        partner_id="regen-key",
        name="Regen Key Partner",
        contact_email="regen@example.com",
    )

    result = await partner_service.regenerate_api_key(partner.partner_id)
    assert result is not None
    updated_partner, new_key = result

    # Old key should no longer work
    old_auth = await partner_service.authenticate_by_api_key(old_key)
    assert old_auth is None

    # New key should work
    new_auth = await partner_service.authenticate_by_api_key(new_key)
    assert new_auth is not None
    assert new_auth.partner_id == partner.partner_id


@pytest.mark.asyncio
async def test_regenerate_api_key_not_found(partner_service, db_client):
    """Test regenerating API key for non-existent partner."""
    result = await partner_service.regenerate_api_key("nonexistent")
    assert result is None


# ============================================
# Capability Management Tests
# ============================================

@pytest.mark.asyncio
async def test_enable_capability(partner_service, db_client):
    """Test enabling a capability for partner."""
    partner, _ = await partner_service.create_partner(
        partner_id="cap-test",
        name="Capability Test",
        contact_email="cap@example.com",
        capabilities=[],
    )

    await partner_service.enable_capability(partner.partner_id, "recap_agent")

    updated = await partner_service.get_partner(partner.partner_id)
    assert "recap_agent" in updated.capabilities
    assert updated.capabilities["recap_agent"].enabled is True


@pytest.mark.asyncio
async def test_disable_capability(partner_service, db_client):
    """Test disabling a capability for partner."""
    partner, _ = await partner_service.create_partner(
        partner_id="disable-cap",
        name="Disable Cap Test",
        contact_email="disable@example.com",
        capabilities=["realtime_dubbing", "semantic_search"],
    )

    await partner_service.disable_capability(partner.partner_id, "realtime_dubbing")

    updated = await partner_service.get_partner(partner.partner_id)
    assert updated.capabilities["realtime_dubbing"].enabled is False
    assert updated.capabilities["semantic_search"].enabled is True


@pytest.mark.asyncio
async def test_enable_capability_with_custom_rate_limits(partner_service, db_client):
    """Test enabling capability with custom rate limits."""
    partner, _ = await partner_service.create_partner(
        partner_id="custom-limits",
        name="Custom Limits Test",
        contact_email="custom@example.com",
    )

    custom_limits = RateLimitConfig(
        requests_per_minute=100,
        requests_per_hour=1000,
        concurrent_sessions=10,
    )

    await partner_service.enable_capability(
        partner.partner_id,
        "semantic_search",
        rate_limits=custom_limits,
    )

    updated = await partner_service.get_partner(partner.partner_id)
    assert updated.capabilities["semantic_search"].rate_limits.requests_per_minute == 100
    assert updated.capabilities["semantic_search"].rate_limits.requests_per_hour == 1000


# ============================================
# Partner Lifecycle Tests
# ============================================

@pytest.mark.asyncio
async def test_get_partner(partner_service, db_client):
    """Test getting partner by ID."""
    partner, _ = await partner_service.create_partner(
        partner_id="get-partner",
        name="Get Partner Test",
        contact_email="get@example.com",
    )

    retrieved = await partner_service.get_partner(partner.partner_id)

    assert retrieved is not None
    assert retrieved.partner_id == partner.partner_id
    assert retrieved.name == "Get Partner Test"


@pytest.mark.asyncio
async def test_get_partner_not_found(partner_service, db_client):
    """Test getting non-existent partner."""
    result = await partner_service.get_partner("nonexistent-partner-id")
    assert result is None


@pytest.mark.asyncio
async def test_update_partner(partner_service, db_client):
    """Test updating partner details."""
    partner, _ = await partner_service.create_partner(
        partner_id="update-test",
        name="Update Test",
        contact_email="update@example.com",
    )

    await partner_service.update_partner(
        partner_id=partner.partner_id,
        name="Updated Name",
        contact_email="newemail@example.com",
    )

    updated = await partner_service.get_partner(partner.partner_id)
    assert updated.name == "Updated Name"
    assert updated.contact_email == "newemail@example.com"


@pytest.mark.asyncio
async def test_update_partner_not_found(partner_service, db_client):
    """Test updating non-existent partner."""
    result = await partner_service.update_partner(
        partner_id="nonexistent",
        name="New Name",
    )
    assert result is None


@pytest.mark.asyncio
async def test_suspend_partner(partner_service, db_client):
    """Test suspending a partner."""
    partner, _ = await partner_service.create_partner(
        partner_id="suspend-test",
        name="Suspend Test",
        contact_email="suspend@example.com",
    )

    await partner_service.suspend_partner(
        partner.partner_id,
        reason="Policy violation",
    )

    updated = await partner_service.get_partner(partner.partner_id)
    assert updated.suspended_at is not None
    assert updated.suspension_reason == "Policy violation"


@pytest.mark.asyncio
async def test_unsuspend_partner(partner_service, db_client):
    """Test unsuspending a partner."""
    partner, _ = await partner_service.create_partner(
        partner_id="unsuspend-test",
        name="Unsuspend Test",
        contact_email="unsuspend@example.com",
    )

    await partner_service.suspend_partner(partner.partner_id, "Testing")
    await partner_service.unsuspend_partner(partner.partner_id)

    updated = await partner_service.get_partner(partner.partner_id)
    assert updated.suspended_at is None
    assert updated.suspension_reason is None


# ============================================
# Webhook Configuration Tests
# ============================================

@pytest.mark.asyncio
async def test_configure_webhook(partner_service, db_client):
    """Test configuring webhook for partner."""
    partner, _ = await partner_service.create_partner(
        partner_id="webhook-test",
        name="Webhook Test",
        contact_email="webhook@example.com",
    )

    await partner_service.configure_webhook(
        partner_id=partner.partner_id,
        webhook_url="https://example.com/webhook",
        events=["session.started", "session.ended"],
    )

    updated = await partner_service.get_partner(partner.partner_id)
    assert updated.webhook_url == "https://example.com/webhook"
    assert "session.started" in updated.webhook_events
    assert "session.ended" in updated.webhook_events
    assert updated.webhook_secret is not None


@pytest.mark.asyncio
async def test_configure_webhook_with_custom_secret(partner_service, db_client):
    """Test configuring webhook with custom secret."""
    partner, _ = await partner_service.create_partner(
        partner_id="webhook-secret-test",
        name="Webhook Secret Test",
        contact_email="secret@example.com",
    )

    await partner_service.configure_webhook(
        partner_id=partner.partner_id,
        webhook_url="https://example.com/webhook",
        events=["session.started"],
        secret="custom-secret-12345",
    )

    updated = await partner_service.get_partner(partner.partner_id)
    assert updated.webhook_secret == "custom-secret-12345"


@pytest.mark.asyncio
async def test_generate_webhook_signature(partner_service, db_client):
    """Test generating webhook signature."""
    partner, _ = await partner_service.create_partner(
        partner_id="sig-test",
        name="Signature Test",
        contact_email="sig@example.com",
    )

    await partner_service.configure_webhook(
        partner_id=partner.partner_id,
        webhook_url="https://example.com/webhook",
        events=["session.started"],
    )

    updated = await partner_service.get_partner(partner.partner_id)
    payload = '{"event": "session.started", "session_id": "test-123"}'

    signature = partner_service.generate_webhook_signature(updated, payload)

    assert signature.startswith("sha256=")
    assert len(signature) > 10


@pytest.mark.asyncio
async def test_generate_webhook_signature_no_secret(partner_service, db_client):
    """Test generating signature without webhook secret."""
    partner, _ = await partner_service.create_partner(
        partner_id="no-secret-test",
        name="No Secret Test",
        contact_email="nosecret@example.com",
    )

    with pytest.raises(ValueError, match="no webhook secret"):
        partner_service.generate_webhook_signature(partner, '{"test": true}')


# ============================================
# Rate Limit Tests
# ============================================

@pytest.mark.asyncio
async def test_default_rate_limits_by_tier(partner_service, db_client):
    """Test that rate limits are set correctly by billing tier."""
    # Free tier
    free_partner, _ = await partner_service.create_partner(
        partner_id="free-tier",
        name="Free Tier",
        contact_email="free@example.com",
        billing_tier="free",
        capabilities=["realtime_dubbing"],
    )

    # Enterprise tier
    enterprise_partner, _ = await partner_service.create_partner(
        partner_id="enterprise-tier",
        name="Enterprise Tier",
        contact_email="enterprise@example.com",
        billing_tier="enterprise",
        capabilities=["realtime_dubbing"],
    )

    free_limits = free_partner.capabilities["realtime_dubbing"].rate_limits
    enterprise_limits = enterprise_partner.capabilities["realtime_dubbing"].rate_limits

    # Enterprise should have higher limits
    assert enterprise_limits.requests_per_minute > free_limits.requests_per_minute
    assert enterprise_limits.requests_per_day > free_limits.requests_per_day


# ============================================
# Edge Cases and Error Handling
# ============================================

@pytest.mark.asyncio
async def test_enable_capability_not_found(partner_service, db_client):
    """Test enabling capability for non-existent partner."""
    result = await partner_service.enable_capability("nonexistent", "recap_agent")
    assert result is None


@pytest.mark.asyncio
async def test_disable_capability_not_found(partner_service, db_client):
    """Test disabling capability for non-existent partner."""
    result = await partner_service.disable_capability("nonexistent", "recap_agent")
    assert result is None


@pytest.mark.asyncio
async def test_suspend_partner_not_found(partner_service, db_client):
    """Test suspending non-existent partner."""
    result = await partner_service.suspend_partner("nonexistent", "reason")
    assert result is None


@pytest.mark.asyncio
async def test_configure_webhook_not_found(partner_service, db_client):
    """Test configuring webhook for non-existent partner."""
    result = await partner_service.configure_webhook(
        partner_id="nonexistent",
        webhook_url="https://example.com",
        events=[],
    )
    assert result is None


# ============================================
# Performance Tests
# ============================================

@pytest.mark.asyncio
async def test_partner_creation_performance(partner_service, db_client):
    """Test partner creation performance."""
    import time

    start = time.time()
    for i in range(10):
        await partner_service.create_partner(
            partner_id=f"perf-test-{i}",
            name=f"Performance Test {i}",
            contact_email=f"perf{i}@example.com",
        )
    duration = (time.time() - start) * 1000

    # 10 registrations should complete in under 3 seconds
    assert duration < 3000, f"Registration took {duration}ms"


@pytest.mark.asyncio
async def test_authentication_performance(partner_service, db_client):
    """Test authentication performance."""
    import time

    partner, api_key = await partner_service.create_partner(
        partner_id="auth-perf",
        name="Auth Perf Test",
        contact_email="authperf@example.com",
    )

    start = time.time()
    for _ in range(10):  # Reduced for network latency
        await partner_service.authenticate_by_api_key(api_key)
    duration = (time.time() - start) * 1000

    # 10 authentications should complete in under 10 seconds
    assert duration < 10000, f"Authentication took {duration}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
