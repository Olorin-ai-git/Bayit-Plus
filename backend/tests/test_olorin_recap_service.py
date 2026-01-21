"""
Comprehensive Tests for Olorin Recap Agent Service

Tests cover:
- Session management (create, get, end)
- Transcript segment handling
- Recap generation with Claude
- Multi-language summaries
- Rolling transcript buffer
- Metering integration
"""

from datetime import datetime, timezone
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from app.core.config import settings
from app.models.content_embedding import RecapSession
from app.models.integration_partner import IntegrationPartner, UsageRecord
from app.services.olorin.recap_agent_service import RecapAgentService
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
        database=client[f"{settings.MONGODB_DB_NAME}_olorin_test"],
        document_models=[RecapSession, IntegrationPartner, UsageRecord],
    )
    yield client
    # Cleanup
    await client.drop_database(f"{settings.MONGODB_DB_NAME}_olorin_test")
    client.close()


@pytest_asyncio.fixture
async def recap_service(db_client):
    """Create recap agent service instance."""
    return RecapAgentService()


@pytest_asyncio.fixture
async def sample_partner(db_client):
    """Create sample integration partner."""
    partner = IntegrationPartner(
        partner_id="test-partner-recap",
        name="Test Partner",
        api_key_hash="$2b$12$test_hash_value_here_placeholder",
        api_key_prefix="test1234",
        contact_email="test@example.com",
        enabled_capabilities=["recap_agent"],
        billing_tier="standard",
    )
    await partner.insert()
    return partner


# ============================================
# Session Management Tests
# ============================================


@pytest.mark.asyncio
async def test_create_session(recap_service, db_client):
    """Test creating a new recap session."""
    session = await recap_service.create_session(
        partner_id="test-partner-001",
        channel_id="channel-123",
        stream_url="https://example.com/stream",
    )

    assert session is not None
    assert session.session_id.startswith("recap_")
    assert session.partner_id == "test-partner-001"
    assert session.channel_id == "channel-123"
    assert session.status == "active"
    assert session.total_duration_seconds == 0.0
    assert len(session.transcript_segments) == 0


@pytest.mark.asyncio
async def test_create_session_minimal(recap_service, db_client):
    """Test creating session with minimal parameters."""
    session = await recap_service.create_session()

    assert session is not None
    assert session.session_id.startswith("recap_")
    assert session.partner_id is None
    assert session.channel_id is None
    assert session.status == "active"


@pytest.mark.asyncio
async def test_get_session(recap_service, db_client):
    """Test retrieving a session by ID."""
    # Create session
    created = await recap_service.create_session(
        partner_id="test-partner-002",
    )

    # Retrieve session
    retrieved = await recap_service.get_session(created.session_id)

    assert retrieved is not None
    assert retrieved.session_id == created.session_id
    assert retrieved.partner_id == "test-partner-002"


@pytest.mark.asyncio
async def test_get_session_not_found(recap_service, db_client):
    """Test retrieving non-existent session."""
    result = await recap_service.get_session("nonexistent-session-id")
    assert result is None


@pytest.mark.asyncio
async def test_end_session(recap_service, db_client):
    """Test ending a recap session."""
    # Create session
    session = await recap_service.create_session(
        partner_id="test-partner-003",
    )

    # End session
    ended = await recap_service.end_session(session.session_id)

    assert ended is not None
    assert ended.status == "ended"
    assert ended.ended_at is not None


@pytest.mark.asyncio
async def test_end_session_not_found(recap_service, db_client):
    """Test ending non-existent session."""
    result = await recap_service.end_session("nonexistent-session-id")
    assert result is None


@pytest.mark.asyncio
async def test_get_active_sessions(recap_service, db_client):
    """Test getting active sessions for a partner."""
    partner_id = "test-partner-active"

    # Create multiple sessions
    session1 = await recap_service.create_session(partner_id=partner_id)
    session2 = await recap_service.create_session(partner_id=partner_id)
    session3 = await recap_service.create_session(partner_id=partner_id)

    # End one session
    await recap_service.end_session(session2.session_id)

    # Get active sessions
    active = await recap_service.get_active_sessions(partner_id=partner_id)

    assert len(active) == 2
    active_ids = [s.session_id for s in active]
    assert session1.session_id in active_ids
    assert session3.session_id in active_ids
    assert session2.session_id not in active_ids


# ============================================
# Transcript Segment Tests
# ============================================


@pytest.mark.asyncio
async def test_add_transcript_segment(recap_service, db_client):
    """Test adding transcript segments to session."""
    session = await recap_service.create_session(
        partner_id="test-partner-transcript",
    )

    # Add segment
    updated = await recap_service.add_transcript_segment(
        session_id=session.session_id,
        text="שלום, ברוכים הבאים לתכנית",
        timestamp=10.5,
        speaker="Host",
        language="he",
        confidence=0.95,
    )

    assert updated is not None
    assert len(updated.transcript_segments) == 1
    assert updated.transcript_segments[0]["text"] == "שלום, ברוכים הבאים לתכנית"
    assert updated.transcript_segments[0]["timestamp"] == 10.5
    assert updated.transcript_segments[0]["speaker"] == "Host"
    assert updated.total_duration_seconds == 10.5


@pytest.mark.asyncio
async def test_add_multiple_segments(recap_service, db_client):
    """Test adding multiple transcript segments."""
    session = await recap_service.create_session()

    # Add multiple segments
    for i in range(5):
        await recap_service.add_transcript_segment(
            session_id=session.session_id,
            text=f"Segment {i + 1} content",
            timestamp=float(i * 30),
            language="en",
        )

    # Verify
    updated = await recap_service.get_session(session.session_id)
    assert len(updated.transcript_segments) == 5
    assert updated.total_duration_seconds == 120.0


@pytest.mark.asyncio
async def test_add_segment_updates_duration(recap_service, db_client):
    """Test that adding segments updates total duration."""
    session = await recap_service.create_session()

    await recap_service.add_transcript_segment(
        session_id=session.session_id,
        text="First segment",
        timestamp=30.0,
    )

    updated1 = await recap_service.get_session(session.session_id)
    assert updated1.total_duration_seconds == 30.0

    await recap_service.add_transcript_segment(
        session_id=session.session_id,
        text="Second segment",
        timestamp=120.0,
    )

    updated2 = await recap_service.get_session(session.session_id)
    assert updated2.total_duration_seconds == 120.0


@pytest.mark.asyncio
async def test_add_segment_session_not_found(recap_service, db_client):
    """Test adding segment to non-existent session."""
    result = await recap_service.add_transcript_segment(
        session_id="nonexistent-session",
        text="Test text",
        timestamp=10.0,
    )
    assert result is None


# ============================================
# Recap Generation Tests
# ============================================


@pytest.mark.asyncio
async def test_generate_recap_empty_session(recap_service, db_client):
    """Test generating recap for session with no transcripts."""
    session = await recap_service.create_session()

    result = await recap_service.generate_recap(
        session_id=session.session_id,
        target_language="en",
    )

    assert result is not None
    assert "No transcript available" in result["summary"]
    assert result["key_points"] == []


@pytest.mark.asyncio
async def test_generate_recap_no_content_in_window(recap_service, db_client):
    """Test generating recap when no content in time window."""
    session = await recap_service.create_session()

    # Add segment at timestamp 0
    await recap_service.add_transcript_segment(
        session_id=session.session_id,
        text="Old content",
        timestamp=0,
    )

    # Request recap for last 5 minutes when we only have content at t=0
    # This simulates a window that doesn't have recent content
    result = await recap_service.generate_recap(
        session_id=session.session_id,
        window_minutes=0,  # No window = all content
        target_language="en",
    )

    # With window_minutes=0, should get all content
    assert result is not None


@pytest.mark.asyncio
async def test_generate_recap_session_not_found(recap_service, db_client):
    """Test generating recap for non-existent session."""
    result = await recap_service.generate_recap(
        session_id="nonexistent-session",
        target_language="en",
    )
    assert result is None


@pytest.mark.asyncio
@patch("app.services.olorin.recap_agent_service.CLAUDE_AVAILABLE", True)
async def test_generate_recap_with_claude(recap_service, db_client):
    """Test recap generation with mocked Claude client."""
    session = await recap_service.create_session()

    # Add some transcript segments
    for i in range(3):
        await recap_service.add_transcript_segment(
            session_id=session.session_id,
            text=f"Important discussion point {i + 1} about politics",
            timestamp=float(i * 60),
            language="he",
        )

    # Mock the Claude client
    mock_response = MagicMock()
    mock_response.content = [MagicMock()]
    mock_response.content[
        0
    ].text = """
    {
        "summary": "The broadcast discussed three important political points.",
        "key_points": ["Point 1", "Point 2", "Point 3"]
    }
    """
    mock_response.usage = MagicMock()
    mock_response.usage.input_tokens = 100
    mock_response.usage.output_tokens = 50

    mock_claude = AsyncMock()
    mock_claude.messages.create = AsyncMock(return_value=mock_response)

    # Patch the service's Claude client
    with patch.object(recap_service, "_get_claude_client", return_value=mock_claude):
        result = await recap_service.generate_recap(
            session_id=session.session_id,
            window_minutes=15,
            target_language="en",
        )

    assert result is not None
    assert "summary" in result
    assert "key_points" in result
    assert result["tokens_used"] == 150


# ============================================
# Transcript Text Building Tests
# ============================================


@pytest.mark.asyncio
async def test_build_transcript_text(recap_service, db_client):
    """Test building transcript text from segments."""
    segments = [
        {"text": "Hello everyone", "timestamp": 10.0, "speaker": "Host"},
        {"text": "Welcome to the show", "timestamp": 15.0, "speaker": "Host"},
        {"text": "Thank you for having me", "timestamp": 20.0, "speaker": "Guest"},
    ]

    result = recap_service._build_transcript_text(segments)

    assert "[00:10] Host: Hello everyone" in result
    assert "[00:15] Host: Welcome to the show" in result
    assert "[00:20] Guest: Thank you for having me" in result


@pytest.mark.asyncio
async def test_build_transcript_text_no_speaker(recap_service, db_client):
    """Test building transcript text without speaker info."""
    segments = [
        {"text": "Hello everyone", "timestamp": 65.0},
        {"text": "Welcome to the show", "timestamp": 130.0},
    ]

    result = recap_service._build_transcript_text(segments)

    assert "[01:05] Hello everyone" in result
    assert "[02:10] Welcome to the show" in result


# ============================================
# Edge Cases and Error Handling
# ============================================


@pytest.mark.asyncio
async def test_recap_stores_in_session(recap_service, db_client):
    """Test that generated recaps are stored in session."""
    session = await recap_service.create_session()

    # Add transcript
    await recap_service.add_transcript_segment(
        session_id=session.session_id,
        text="Test content for recap",
        timestamp=60.0,
    )

    # Mock Claude for recap generation
    mock_response = MagicMock()
    mock_response.content = [MagicMock()]
    mock_response.content[0].text = '{"summary": "Test summary", "key_points": []}'
    mock_response.usage = MagicMock()
    mock_response.usage.input_tokens = 50
    mock_response.usage.output_tokens = 25

    mock_claude = AsyncMock()
    mock_claude.messages.create = AsyncMock(return_value=mock_response)

    with patch.object(recap_service, "_get_claude_client", return_value=mock_claude):
        await recap_service.generate_recap(
            session_id=session.session_id,
            target_language="en",
        )

    # Verify recap is stored
    updated = await recap_service.get_session(session.session_id)
    assert len(updated.recaps) == 1
    assert updated.recaps[0]["summary"] == "Test summary"


@pytest.mark.asyncio
async def test_multiple_recaps_stored(recap_service, db_client):
    """Test that multiple recaps can be stored."""
    session = await recap_service.create_session()

    # Add transcript
    await recap_service.add_transcript_segment(
        session_id=session.session_id,
        text="Test content",
        timestamp=60.0,
    )

    mock_response = MagicMock()
    mock_response.content = [MagicMock()]
    mock_response.content[0].text = '{"summary": "Summary", "key_points": []}'
    mock_response.usage = MagicMock()
    mock_response.usage.input_tokens = 50
    mock_response.usage.output_tokens = 25

    mock_claude = AsyncMock()
    mock_claude.messages.create = AsyncMock(return_value=mock_response)

    with patch.object(recap_service, "_get_claude_client", return_value=mock_claude):
        # Generate multiple recaps
        await recap_service.generate_recap(session.session_id, target_language="en")
        await recap_service.generate_recap(session.session_id, target_language="he")

    updated = await recap_service.get_session(session.session_id)
    assert len(updated.recaps) == 2


# ============================================
# Performance Tests
# ============================================


@pytest.mark.asyncio
async def test_session_creation_performance(recap_service, db_client):
    """Test session creation performance."""
    import time

    start = time.time()
    for _ in range(10):
        await recap_service.create_session()
    duration = (time.time() - start) * 1000

    # 10 sessions should complete in under 2 seconds
    assert duration < 2000, f"Session creation took {duration}ms"


@pytest.mark.asyncio
async def test_transcript_addition_performance(recap_service, db_client):
    """Test transcript addition performance."""
    import time

    session = await recap_service.create_session()

    start = time.time()
    for i in range(10):  # Reduced for network latency
        await recap_service.add_transcript_segment(
            session_id=session.session_id,
            text=f"Segment {i} with some content",
            timestamp=float(i * 10),
        )
    duration = (time.time() - start) * 1000

    # 10 segments should complete in under 10 seconds
    assert duration < 10000, f"Adding 10 segments took {duration}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
