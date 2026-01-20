"""
Comprehensive Tests for Olorin Metering Service

Tests cover:
- Usage recording for all capabilities
- Cost calculation
- Usage summaries
- Session management
- Rate limit checking
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from app.core.config import settings
from app.models.integration_partner import (
    CapabilityConfig,
    DubbingSession,
    IntegrationPartner,
    RateLimitConfig,
    UsageRecord,
)
from app.services.olorin.metering import MeteringService
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

# ============================================
# Test Fixtures
# ============================================


@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[f"{settings.MONGODB_DB_NAME}_metering_test"],
        document_models=[IntegrationPartner, UsageRecord, DubbingSession],
    )
    yield client
    # Cleanup
    await client.drop_database(f"{settings.MONGODB_DB_NAME}_metering_test")
    client.close()


@pytest_asyncio.fixture
async def metering_service(db_client):
    """Create metering service instance."""
    return MeteringService()


@pytest_asyncio.fixture
async def sample_partner(db_client):
    """Create sample integration partner."""
    partner = IntegrationPartner(
        partner_id="test-metering-partner",
        name="Test Metering Partner",
        api_key_hash="$2b$12$test_hash",
        api_key_prefix="metering1",
        contact_email="metering@example.com",
        capabilities={
            "realtime_dubbing": CapabilityConfig(
                enabled=True,
                rate_limits=RateLimitConfig(
                    requests_per_minute=60,
                    requests_per_hour=500,
                    requests_per_day=5000,
                ),
            ),
            "semantic_search": CapabilityConfig(
                enabled=True,
                rate_limits=RateLimitConfig(
                    requests_per_minute=100,
                    requests_per_hour=1000,
                    requests_per_day=10000,
                ),
            ),
            "recap_agent": CapabilityConfig(
                enabled=True,
                rate_limits=RateLimitConfig(
                    requests_per_minute=30,
                    requests_per_hour=200,
                    requests_per_day=1000,
                ),
            ),
        },
        billing_tier="standard",
        monthly_usage_limit_usd=100.0,
    )
    await partner.insert()
    return partner


# ============================================
# Dubbing Usage Recording Tests
# ============================================


@pytest.mark.asyncio
async def test_record_dubbing_usage(metering_service, db_client, sample_partner):
    """Test recording dubbing usage."""
    record = await metering_service.record_dubbing_usage(
        partner_id=sample_partner.partner_id,
        session_id="test-session-001",
        audio_seconds=120.5,
        characters_translated=5000,
        characters_synthesized=5000,
    )

    assert record is not None
    assert record.partner_id == sample_partner.partner_id
    assert record.capability == "realtime_dubbing"
    assert record.request_count == 1
    assert record.audio_seconds_processed == 120.5
    assert record.characters_processed == 10000
    assert record.estimated_cost_usd > 0


@pytest.mark.asyncio
async def test_dubbing_usage_aggregation(metering_service, db_client, sample_partner):
    """Test that multiple dubbing usages aggregate within same period."""
    # First usage
    await metering_service.record_dubbing_usage(
        partner_id=sample_partner.partner_id,
        session_id="session-1",
        audio_seconds=60.0,
        characters_translated=2000,
        characters_synthesized=2000,
    )

    # Second usage in same period
    await metering_service.record_dubbing_usage(
        partner_id=sample_partner.partner_id,
        session_id="session-2",
        audio_seconds=90.0,
        characters_translated=3000,
        characters_synthesized=3000,
    )

    # Check aggregation
    records = await UsageRecord.find(
        UsageRecord.partner_id == sample_partner.partner_id,
        UsageRecord.capability == "realtime_dubbing",
    ).to_list()

    # Should be aggregated into single record
    assert len(records) == 1
    assert records[0].request_count == 2
    assert records[0].audio_seconds_processed == 150.0
    assert records[0].characters_processed == 10000


# ============================================
# Search Usage Recording Tests
# ============================================


@pytest.mark.asyncio
async def test_record_search_usage(metering_service, db_client, sample_partner):
    """Test recording search usage."""
    record = await metering_service.record_search_usage(
        partner_id=sample_partner.partner_id,
        tokens_used=500,
        results_returned=20,
    )

    assert record is not None
    assert record.partner_id == sample_partner.partner_id
    assert record.capability == "semantic_search"
    assert record.request_count == 1
    assert record.tokens_consumed == 500
    assert record.estimated_cost_usd > 0


@pytest.mark.asyncio
async def test_search_usage_aggregation(metering_service, db_client, sample_partner):
    """Test that search usages aggregate within same period."""
    for i in range(5):
        await metering_service.record_search_usage(
            partner_id=sample_partner.partner_id,
            tokens_used=100,
            results_returned=10,
        )

    records = await UsageRecord.find(
        UsageRecord.partner_id == sample_partner.partner_id,
        UsageRecord.capability == "semantic_search",
    ).to_list()

    assert len(records) == 1
    assert records[0].request_count == 5
    assert records[0].tokens_consumed == 500


# ============================================
# Context Usage Recording Tests
# ============================================


@pytest.mark.asyncio
async def test_record_context_usage(metering_service, db_client, sample_partner):
    """Test recording cultural context usage."""
    record = await metering_service.record_context_usage(
        partner_id=sample_partner.partner_id,
        tokens_used=300,
        references_found=5,
    )

    assert record is not None
    assert record.partner_id == sample_partner.partner_id
    assert record.capability == "cultural_context"
    assert record.request_count == 1
    assert record.tokens_consumed == 300


# ============================================
# Recap Usage Recording Tests
# ============================================


@pytest.mark.asyncio
async def test_record_recap_usage(metering_service, db_client, sample_partner):
    """Test recording recap agent usage."""
    record = await metering_service.record_recap_usage(
        partner_id=sample_partner.partner_id,
        tokens_used=800,
        transcript_seconds=600.0,
    )

    assert record is not None
    assert record.partner_id == sample_partner.partner_id
    assert record.capability == "recap_agent"
    assert record.request_count == 1
    assert record.tokens_consumed == 800
    assert record.audio_seconds_processed == 600.0


@pytest.mark.asyncio
async def test_recap_usage_aggregation(metering_service, db_client, sample_partner):
    """Test that recap usages aggregate within same period."""
    for _ in range(3):
        await metering_service.record_recap_usage(
            partner_id=sample_partner.partner_id,
            tokens_used=400,
            transcript_seconds=300.0,
        )

    records = await UsageRecord.find(
        UsageRecord.partner_id == sample_partner.partner_id,
        UsageRecord.capability == "recap_agent",
    ).to_list()

    assert len(records) == 1
    assert records[0].request_count == 3
    assert records[0].tokens_consumed == 1200
    assert records[0].audio_seconds_processed == 900.0


# ============================================
# Usage Summary Tests
# ============================================


@pytest.mark.asyncio
async def test_get_usage_summary(metering_service, db_client, sample_partner):
    """Test getting usage summary for partner."""
    # Record various usages
    await metering_service.record_dubbing_usage(
        partner_id=sample_partner.partner_id,
        session_id="s1",
        audio_seconds=100,
        characters_translated=1000,
        characters_synthesized=1000,
    )
    await metering_service.record_search_usage(
        partner_id=sample_partner.partner_id,
        tokens_used=500,
        results_returned=20,
    )
    await metering_service.record_recap_usage(
        partner_id=sample_partner.partner_id,
        tokens_used=600,
        transcript_seconds=400,
    )

    summary = await metering_service.get_usage_summary(
        partner_id=sample_partner.partner_id,
    )

    assert summary is not None
    assert "totals" in summary
    assert "by_capability" in summary
    assert summary["totals"]["request_count"] >= 3


@pytest.mark.asyncio
async def test_get_usage_summary_by_capability(
    metering_service, db_client, sample_partner
):
    """Test getting usage summary filtered by capability."""
    await metering_service.record_dubbing_usage(
        partner_id=sample_partner.partner_id,
        session_id="s1",
        audio_seconds=100,
        characters_translated=1000,
        characters_synthesized=1000,
    )
    await metering_service.record_search_usage(
        partner_id=sample_partner.partner_id,
        tokens_used=500,
        results_returned=20,
    )

    summary = await metering_service.get_usage_summary(
        partner_id=sample_partner.partner_id,
        capability="realtime_dubbing",
    )

    assert summary is not None
    # Should only contain dubbing usage
    assert "realtime_dubbing" in summary.get("by_capability", {})


@pytest.mark.asyncio
async def test_get_usage_summary_date_range(
    metering_service, db_client, sample_partner
):
    """Test getting usage summary with date range."""
    await metering_service.record_dubbing_usage(
        partner_id=sample_partner.partner_id,
        session_id="s1",
        audio_seconds=100,
        characters_translated=1000,
        characters_synthesized=1000,
    )

    now = datetime.now(timezone.utc)
    summary = await metering_service.get_usage_summary(
        partner_id=sample_partner.partner_id,
        start_date=now - timedelta(hours=1),
        end_date=now + timedelta(hours=1),
    )

    assert summary is not None
    assert summary["totals"]["request_count"] >= 1


# ============================================
# Usage Limit Tests
# ============================================


@pytest.mark.asyncio
async def test_check_usage_limit_within_limit(
    metering_service, db_client, sample_partner
):
    """Test checking usage when within limit."""
    # Record some usage (small amount)
    await metering_service.record_search_usage(
        partner_id=sample_partner.partner_id,
        tokens_used=100,
        results_returned=10,
    )

    allowed, message = await metering_service.check_usage_limit(
        partner=sample_partner,
        capability="semantic_search",
    )

    assert allowed is True
    assert message is None


@pytest.mark.asyncio
async def test_check_usage_limit_no_limit_set(metering_service, db_client):
    """Test checking usage when no limit is set."""
    partner = IntegrationPartner(
        partner_id="no-limit-partner",
        name="No Limit Partner",
        api_key_hash="$2b$12$test",
        api_key_prefix="nolimit1",
        contact_email="nolimit@example.com",
        billing_tier="enterprise",
        monthly_usage_limit_usd=None,  # No limit
        capabilities={
            "semantic_search": CapabilityConfig(
                enabled=True,
                rate_limits=RateLimitConfig(
                    requests_per_minute=100,
                    requests_per_hour=1000,
                ),
            ),
        },
    )
    await partner.insert()

    allowed, message = await metering_service.check_usage_limit(
        partner=partner,
        capability="semantic_search",
    )

    # Should be allowed when no limit is set
    assert allowed is True


# ============================================
# Session Management Tests
# ============================================


@pytest.mark.asyncio
async def test_create_dubbing_session(metering_service, db_client, sample_partner):
    """Test creating a dubbing session record."""
    session = await metering_service.create_dubbing_session(
        partner_id=sample_partner.partner_id,
        session_id="dubbing-001",
        source_language="he",
        target_language="en",
        voice_id="voice-123",
        client_ip="192.168.1.100",
        client_user_agent="TestClient/1.0",
    )

    assert session is not None
    assert session.session_id == "dubbing-001"
    assert session.partner_id == sample_partner.partner_id
    assert session.source_language == "he"
    assert session.target_language == "en"
    assert session.status == "active"


@pytest.mark.asyncio
async def test_update_dubbing_session(metering_service, db_client, sample_partner):
    """Test updating dubbing session metrics."""
    session = await metering_service.create_dubbing_session(
        partner_id=sample_partner.partner_id,
        session_id="dubbing-update",
        source_language="he",
        target_language="en",
    )

    updated = await metering_service.update_dubbing_session(
        session_id="dubbing-update",
        audio_seconds_processed=300.5,
        characters_translated=10000,
    )

    assert updated is not None
    assert updated.audio_seconds_processed == 300.5
    assert updated.characters_translated == 10000


@pytest.mark.asyncio
async def test_end_dubbing_session(metering_service, db_client, sample_partner):
    """Test ending a dubbing session."""
    await metering_service.create_dubbing_session(
        partner_id=sample_partner.partner_id,
        session_id="dubbing-end",
        source_language="he",
        target_language="en",
    )

    ended = await metering_service.end_dubbing_session(
        session_id="dubbing-end",
        status="ended",  # Use valid status literal
    )

    assert ended is not None
    assert ended.status == "ended"
    assert ended.ended_at is not None


@pytest.mark.asyncio
async def test_end_dubbing_session_with_error(
    metering_service, db_client, sample_partner
):
    """Test ending a dubbing session with error."""
    await metering_service.create_dubbing_session(
        partner_id=sample_partner.partner_id,
        session_id="dubbing-error",
        source_language="he",
        target_language="en",
    )

    ended = await metering_service.end_dubbing_session(
        session_id="dubbing-error",
        status="error",
        error_message="Audio processing failed",
    )

    assert ended is not None
    assert ended.status == "error"
    assert ended.error_message == "Audio processing failed"


@pytest.mark.asyncio
async def test_get_dubbing_session(metering_service, db_client, sample_partner):
    """Test getting dubbing session by ID."""
    await metering_service.create_dubbing_session(
        partner_id=sample_partner.partner_id,
        session_id="dubbing-get",
        source_language="he",
        target_language="en",
    )

    retrieved = await metering_service.get_dubbing_session("dubbing-get")

    assert retrieved is not None
    assert retrieved.session_id == "dubbing-get"


@pytest.mark.asyncio
async def test_get_dubbing_session_not_found(metering_service, db_client):
    """Test getting non-existent dubbing session."""
    result = await metering_service.get_dubbing_session("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_get_active_sessions_count(metering_service, db_client, sample_partner):
    """Test getting count of active sessions."""
    # Create multiple sessions
    for i in range(5):
        await metering_service.create_dubbing_session(
            partner_id=sample_partner.partner_id,
            session_id=f"active-session-{i}",
            source_language="he",
            target_language="en",
        )

    # End some sessions (use valid status literal)
    await metering_service.end_dubbing_session("active-session-0", status="ended")
    await metering_service.end_dubbing_session("active-session-1", status="ended")

    count = await metering_service.get_active_sessions_count(sample_partner.partner_id)

    assert count == 3


# ============================================
# Cost Calculation Tests
# ============================================


@pytest.mark.asyncio
async def test_dubbing_cost_calculation(metering_service, db_client, sample_partner):
    """Test that dubbing costs are calculated correctly."""
    # Record usage with known values
    record = await metering_service.record_dubbing_usage(
        partner_id=sample_partner.partner_id,
        session_id="cost-test",
        audio_seconds=600.0,  # 10 minutes
        characters_translated=50000,  # 50k chars
        characters_synthesized=50000,  # 50k chars
    )

    # Cost should be positive and reasonable
    assert record.estimated_cost_usd > 0
    # Cost should be less than $10 for this usage
    assert record.estimated_cost_usd < 10


@pytest.mark.asyncio
async def test_search_cost_calculation(metering_service, db_client, sample_partner):
    """Test that search costs are calculated correctly."""
    record = await metering_service.record_search_usage(
        partner_id=sample_partner.partner_id,
        tokens_used=10000,  # 10k tokens
        results_returned=50,
    )

    # Embedding cost should be very small (~$0.002 per 1K tokens)
    assert record.estimated_cost_usd > 0
    assert record.estimated_cost_usd < 0.1


@pytest.mark.asyncio
async def test_llm_cost_calculation(metering_service, db_client, sample_partner):
    """Test that LLM costs are calculated correctly."""
    record = await metering_service.record_recap_usage(
        partner_id=sample_partner.partner_id,
        tokens_used=5000,  # 5k tokens
        transcript_seconds=600,
    )

    # LLM cost should be reasonable
    assert record.estimated_cost_usd > 0
    assert record.estimated_cost_usd < 1.0


# ============================================
# Edge Cases and Error Handling
# ============================================


@pytest.mark.asyncio
async def test_update_nonexistent_session(metering_service, db_client):
    """Test updating non-existent session."""
    result = await metering_service.update_dubbing_session(
        session_id="nonexistent",
        total_audio_seconds=100,
    )
    assert result is None


@pytest.mark.asyncio
async def test_end_nonexistent_session(metering_service, db_client):
    """Test ending non-existent session."""
    result = await metering_service.end_dubbing_session(
        session_id="nonexistent",
        status="completed",
    )
    assert result is None


@pytest.mark.asyncio
async def test_zero_usage_recording(metering_service, db_client, sample_partner):
    """Test recording zero usage values."""
    record = await metering_service.record_dubbing_usage(
        partner_id=sample_partner.partner_id,
        session_id="zero-test",
        audio_seconds=0,
        characters_translated=0,
        characters_synthesized=0,
    )

    assert record is not None
    assert record.request_count == 1
    assert record.estimated_cost_usd == 0


# ============================================
# Performance Tests
# ============================================


@pytest.mark.asyncio
async def test_usage_recording_performance(metering_service, db_client, sample_partner):
    """Test usage recording performance."""
    import time

    start = time.time()
    for i in range(10):  # Reduced for network latency
        await metering_service.record_search_usage(
            partner_id=sample_partner.partner_id,
            tokens_used=100,
            results_returned=10,
        )
    duration = (time.time() - start) * 1000

    # 10 recordings should complete in under 10 seconds
    assert duration < 10000, f"Recording 10 usages took {duration}ms"


@pytest.mark.asyncio
async def test_session_creation_performance(
    metering_service, db_client, sample_partner
):
    """Test session creation performance."""
    import time

    start = time.time()
    for i in range(50):
        await metering_service.create_dubbing_session(
            partner_id=sample_partner.partner_id,
            session_id=f"perf-{i}",
            source_language="he",
            target_language="en",
        )
    duration = (time.time() - start) * 1000

    # 50 sessions should complete in under 2 seconds
    assert duration < 2000, f"Creating 50 sessions took {duration}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
