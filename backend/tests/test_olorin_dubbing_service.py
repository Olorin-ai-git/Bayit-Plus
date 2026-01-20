"""
Comprehensive Tests for Olorin Realtime Dubbing Service

Tests cover:
- Service initialization and lifecycle
- Audio processing
- Session management
- WebSocket message handling
- Metrics collection
- Metering integration
"""

import pytest
import pytest_asyncio
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.integration_partner import (
    IntegrationPartner,
    UsageRecord,
    DubbingSession,
)
from app.services.olorin.dubbing.service import RealtimeDubbingService
from app.services.olorin.dubbing.models import DubbingMessage, DubbingMetrics
from app.core.config import settings


# ============================================
# Test Fixtures
# ============================================

@pytest_asyncio.fixture
async def db_client():
    """Create test database client."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[f"{settings.MONGODB_DB_NAME}_dubbing_test"],
        document_models=[IntegrationPartner, UsageRecord, DubbingSession]
    )
    yield client
    # Cleanup
    await client.drop_database(f"{settings.MONGODB_DB_NAME}_dubbing_test")
    client.close()


@pytest_asyncio.fixture
async def sample_partner(db_client):
    """Create sample integration partner."""
    partner = IntegrationPartner(
        partner_id="test-partner-dubbing",
        name="Test Dubbing Partner",
        api_key_hash="$2b$12$test_hash_value_here_placeholder",
        api_key_prefix="test1234",
        contact_email="dubbing@example.com",
        enabled_capabilities=["realtime_dubbing"],
        billing_tier="standard",
    )
    await partner.insert()
    return partner


@pytest_asyncio.fixture
def dubbing_service(sample_partner):
    """Create dubbing service instance."""
    return RealtimeDubbingService(
        partner=sample_partner,
        source_language="he",
        target_language="en",
    )


# ============================================
# Service Initialization Tests
# ============================================

@pytest.mark.asyncio
async def test_service_creation(sample_partner, db_client):
    """Test dubbing service can be instantiated."""
    service = RealtimeDubbingService(
        partner=sample_partner,
        source_language="he",
        target_language="en",
    )

    assert service is not None
    assert service.source_language == "he"
    assert service.target_language == "en"
    assert service.session_id.startswith("dub_")


@pytest.mark.asyncio
async def test_service_creation_spanish_target(sample_partner, db_client):
    """Test service creation with Spanish target."""
    service = RealtimeDubbingService(
        partner=sample_partner,
        source_language="he",
        target_language="es",
    )

    assert service.target_language == "es"


@pytest.mark.asyncio
async def test_service_creation_custom_voice(sample_partner, db_client):
    """Test service creation with custom voice ID."""
    service = RealtimeDubbingService(
        partner=sample_partner,
        voice_id="custom-voice-123",
    )

    assert service.voice_id == "custom-voice-123"


@pytest.mark.asyncio
async def test_service_initial_state(dubbing_service, db_client):
    """Test service initial state."""
    assert dubbing_service.is_running is False
    assert dubbing_service.stt_service is None
    assert dubbing_service.metrics.segments_processed == 0


# ============================================
# Service Lifecycle Tests
# ============================================

@pytest.mark.asyncio
@patch("app.services.olorin.dubbing.service.pipeline.process_transcripts")
@patch("app.services.olorin.dubbing.translation.TranslationProvider.initialize")
@patch("app.services.olorin.dubbing.service.ElevenLabsRealtimeService")
@patch("app.services.olorin.dubbing.service.metering_service")
async def test_service_start(
    mock_metering, mock_stt_class, mock_translate_init, mock_pipeline, dubbing_service, db_client
):
    """Test starting dubbing service."""
    # Setup mocks
    mock_stt = AsyncMock()
    mock_stt_class.return_value = mock_stt
    mock_metering.create_dubbing_session = AsyncMock()
    mock_translate_init.return_value = None
    mock_pipeline.return_value = None

    await dubbing_service.start()

    assert dubbing_service.is_running is True
    mock_stt.connect.assert_called_once()
    mock_metering.create_dubbing_session.assert_called_once()


@pytest.mark.asyncio
@patch("app.services.olorin.dubbing.service.pipeline.process_transcripts")
@patch("app.services.olorin.dubbing.translation.TranslationProvider.initialize")
@patch("app.services.olorin.dubbing.service.ElevenLabsRealtimeService")
@patch("app.services.olorin.dubbing.service.metering_service")
async def test_service_start_already_running(
    mock_metering, mock_stt_class, mock_translate_init, mock_pipeline, dubbing_service, db_client
):
    """Test starting service that's already running."""
    mock_stt = AsyncMock()
    mock_stt_class.return_value = mock_stt
    mock_metering.create_dubbing_session = AsyncMock()
    mock_translate_init.return_value = None
    mock_pipeline.return_value = None

    await dubbing_service.start()
    await dubbing_service.start()  # Second start should be no-op

    # Should only connect once
    assert mock_stt.connect.call_count == 1


@pytest.mark.asyncio
@patch("app.services.olorin.dubbing.service.metering_service")
async def test_service_stop(mock_metering, dubbing_service, db_client):
    """Test stopping dubbing service."""
    mock_metering.end_dubbing_session = AsyncMock(return_value=MagicMock(
        estimated_cost_usd=0.05
    ))
    mock_metering.update_dubbing_session = AsyncMock()

    # Manually set running state
    dubbing_service._running = True

    result = await dubbing_service.stop()

    assert dubbing_service.is_running is False
    assert "session_id" in result
    assert "partner_id" in result
    mock_metering.end_dubbing_session.assert_called_once()


@pytest.mark.asyncio
@patch("app.services.olorin.dubbing.service.metering_service")
async def test_service_stop_with_error(mock_metering, dubbing_service, db_client):
    """Test stopping service with error message."""
    mock_metering.end_dubbing_session = AsyncMock(return_value=MagicMock(
        estimated_cost_usd=0.0
    ))
    mock_metering.update_dubbing_session = AsyncMock()

    dubbing_service._running = True

    result = await dubbing_service.stop(error_message="Connection lost")

    mock_metering.end_dubbing_session.assert_called_with(
        session_id=dubbing_service.session_id,
        status="error",
        error_message="Connection lost",
    )


# ============================================
# Audio Processing Tests
# ============================================

@pytest.mark.asyncio
@patch("app.services.olorin.dubbing.service.pipeline.process_transcripts")
@patch("app.services.olorin.dubbing.translation.TranslationProvider.initialize")
@patch("app.services.olorin.dubbing.service.ElevenLabsRealtimeService")
@patch("app.services.olorin.dubbing.service.metering_service")
async def test_process_audio_chunk(
    mock_metering, mock_stt_class, mock_translate_init, mock_pipeline, dubbing_service, db_client
):
    """Test processing audio chunk."""
    mock_stt = AsyncMock()
    mock_stt_class.return_value = mock_stt
    mock_metering.create_dubbing_session = AsyncMock()
    mock_translate_init.return_value = None
    mock_pipeline.return_value = None

    await dubbing_service.start()

    audio_data = b"\x00" * 1024  # Dummy audio data
    await dubbing_service.process_audio_chunk(audio_data)

    mock_stt.send_audio_chunk.assert_called_once_with(audio_data)


@pytest.mark.asyncio
async def test_process_audio_chunk_not_running(dubbing_service, db_client):
    """Test processing audio when service not running."""
    audio_data = b"\x00" * 1024

    # Should not raise error, just return early
    await dubbing_service.process_audio_chunk(audio_data)


@pytest.mark.asyncio
@patch("app.services.olorin.dubbing.service.pipeline.process_transcripts")
@patch("app.services.olorin.dubbing.translation.TranslationProvider.initialize")
@patch("app.services.olorin.dubbing.service.ElevenLabsRealtimeService")
@patch("app.services.olorin.dubbing.service.metering_service")
async def test_process_audio_sets_segment_time(
    mock_metering, mock_stt_class, mock_translate_init, mock_pipeline, dubbing_service, db_client
):
    """Test that processing audio sets segment start time."""
    mock_stt = AsyncMock()
    mock_stt_class.return_value = mock_stt
    mock_metering.create_dubbing_session = AsyncMock()
    mock_translate_init.return_value = None
    mock_pipeline.return_value = None

    await dubbing_service.start()

    # Initially None
    assert dubbing_service._current_segment_start_time is None

    await dubbing_service.process_audio_chunk(b"\x00" * 100)

    # Should be set after processing
    assert dubbing_service._current_segment_start_time is not None


# ============================================
# Message Receiving Tests
# ============================================

@pytest.mark.asyncio
async def test_receive_messages_session_started(dubbing_service, db_client):
    """Test receiving session_started message."""
    # Add a message to queue
    await dubbing_service._output_queue.put(
        DubbingMessage(
            type="session_started",
            session_id=dubbing_service.session_id,
        )
    )

    dubbing_service._running = True
    messages = []

    async def collect_messages():
        async for msg in dubbing_service.receive_messages():
            messages.append(msg)
            dubbing_service._running = False
            break

    await asyncio.wait_for(collect_messages(), timeout=2.0)

    assert len(messages) == 1
    assert messages[0].type == "session_started"


@pytest.mark.asyncio
async def test_receive_messages_transcript(dubbing_service, db_client):
    """Test receiving transcript message."""
    await dubbing_service._output_queue.put(
        DubbingMessage(
            type="transcript",
            original_text="שלום",
            source_language="he",
        )
    )

    dubbing_service._running = True
    messages = []

    async def collect_messages():
        async for msg in dubbing_service.receive_messages():
            messages.append(msg)
            dubbing_service._running = False
            break

    await asyncio.wait_for(collect_messages(), timeout=2.0)

    assert len(messages) == 1
    assert messages[0].type == "transcript"
    assert messages[0].original_text == "שלום"


@pytest.mark.asyncio
async def test_receive_messages_dubbed_audio(dubbing_service, db_client):
    """Test receiving dubbed audio message."""
    await dubbing_service._output_queue.put(
        DubbingMessage(
            type="dubbed_audio",
            data="base64-audio-data",
            original_text="שלום",
            translated_text="Hello",
            latency_ms=500.0,
        )
    )

    dubbing_service._running = True
    messages = []

    async def collect_messages():
        async for msg in dubbing_service.receive_messages():
            messages.append(msg)
            dubbing_service._running = False
            break

    await asyncio.wait_for(collect_messages(), timeout=2.0)

    assert len(messages) == 1
    assert messages[0].type == "dubbed_audio"
    assert messages[0].data == "base64-audio-data"


# ============================================
# Metrics Tests
# ============================================

@pytest.mark.asyncio
async def test_metrics_initial_state(dubbing_service, db_client):
    """Test metrics initial state."""
    metrics = dubbing_service.metrics

    assert metrics.segments_processed == 0
    assert metrics.total_characters_translated == 0
    assert metrics.total_characters_synthesized == 0
    assert metrics.error_count == 0


@pytest.mark.asyncio
async def test_metrics_property(dubbing_service, db_client):
    """Test metrics property access."""
    # Simulate some processing
    dubbing_service._metrics.segments_processed = 5
    dubbing_service._metrics.total_characters_translated = 100

    metrics = dubbing_service.metrics

    assert metrics.segments_processed == 5
    assert metrics.total_characters_translated == 100


# ============================================
# DubbingMessage Tests
# ============================================

def test_dubbing_message_creation():
    """Test DubbingMessage creation."""
    msg = DubbingMessage(
        type="transcript",
        original_text="שלום",
        source_language="he",
    )

    assert msg.type == "transcript"
    assert msg.original_text == "שלום"


def test_dubbing_message_to_dict():
    """Test DubbingMessage to_dict method."""
    msg = DubbingMessage(
        type="translation",
        original_text="שלום",
        translated_text="Hello",
        latency_ms=100.5,
    )

    d = msg.to_dict()

    assert d["type"] == "translation"
    assert d["original_text"] == "שלום"
    assert d["translated_text"] == "Hello"
    assert d["latency_ms"] == 100.5


def test_dubbing_message_dubbed_audio():
    """Test DubbingMessage for dubbed audio."""
    msg = DubbingMessage(
        type="dubbed_audio",
        data="base64data",
        original_text="שלום",
        translated_text="Hello",
        source_language="he",
        target_language="en",
        latency_ms=750.0,
    )

    d = msg.to_dict()

    assert d["type"] == "dubbed_audio"
    assert d["data"] == "base64data"
    assert d["source_language"] == "he"
    assert d["target_language"] == "en"


# ============================================
# DubbingMetrics Tests
# ============================================

def test_dubbing_metrics_creation():
    """Test DubbingMetrics creation."""
    metrics = DubbingMetrics()

    assert metrics.segments_processed == 0
    assert metrics.stt_latencies_ms == []
    assert metrics.translation_latencies_ms == []
    assert metrics.tts_latencies_ms == []


def test_dubbing_metrics_avg_stt_latency():
    """Test average STT latency calculation."""
    metrics = DubbingMetrics()
    metrics.stt_latencies_ms = [100, 150, 200]

    avg = metrics.avg_stt_latency_ms

    assert avg == 150.0


def test_dubbing_metrics_avg_stt_latency_empty():
    """Test average STT latency with no data."""
    metrics = DubbingMetrics()

    avg = metrics.avg_stt_latency_ms

    assert avg is None


def test_dubbing_metrics_avg_translation_latency():
    """Test average translation latency calculation."""
    metrics = DubbingMetrics()
    metrics.translation_latencies_ms = [50, 75, 100]

    avg = metrics.avg_translation_latency_ms

    assert avg == 75.0


def test_dubbing_metrics_avg_tts_latency():
    """Test average TTS latency calculation."""
    metrics = DubbingMetrics()
    metrics.tts_latencies_ms = [200, 250, 300]

    avg = metrics.avg_tts_latency_ms

    assert avg == 250.0


def test_dubbing_metrics_avg_total_latency():
    """Test average total latency calculation."""
    metrics = DubbingMetrics()
    metrics.total_latencies_ms = [400, 500, 600]

    avg = metrics.avg_total_latency_ms

    assert avg == 500.0


# ============================================
# Integration Tests
# ============================================

@pytest.mark.asyncio
@patch("app.services.olorin.dubbing.service.pipeline.process_transcripts")
@patch("app.services.olorin.dubbing.translation.TranslationProvider.initialize")
@patch("app.services.olorin.dubbing.service.ElevenLabsRealtimeService")
@patch("app.services.olorin.dubbing.service.metering_service")
async def test_full_session_lifecycle(
    mock_metering, mock_stt_class, mock_translate_init, mock_pipeline, sample_partner, db_client
):
    """Test complete session lifecycle."""
    # Setup mocks
    mock_stt = AsyncMock()
    mock_stt_class.return_value = mock_stt
    mock_metering.create_dubbing_session = AsyncMock()
    mock_metering.end_dubbing_session = AsyncMock(return_value=MagicMock(
        estimated_cost_usd=0.10
    ))
    mock_metering.update_dubbing_session = AsyncMock()
    mock_translate_init.return_value = None
    mock_pipeline.return_value = None

    # Create service
    service = RealtimeDubbingService(
        partner=sample_partner,
        source_language="he",
        target_language="en",
    )

    # Start
    await service.start()
    assert service.is_running is True

    # Process audio
    await service.process_audio_chunk(b"\x00" * 1024)

    # Stop
    result = await service.stop()

    assert service.is_running is False
    assert "session_id" in result
    assert "estimated_cost_usd" in result


# ============================================
# Error Handling Tests
# ============================================

@pytest.mark.asyncio
@patch("app.services.olorin.dubbing.translation.TranslationProvider.initialize")
@patch("app.services.olorin.dubbing.service.ElevenLabsRealtimeService")
@patch("app.services.olorin.dubbing.service.metering_service")
async def test_start_handles_stt_failure(
    mock_metering, mock_stt_class, mock_translate_init, dubbing_service, db_client
):
    """Test handling STT connection failure."""
    mock_stt = AsyncMock()
    mock_stt.connect.side_effect = Exception("STT connection failed")
    mock_stt_class.return_value = mock_stt
    mock_metering.create_dubbing_session = AsyncMock()
    mock_metering.end_dubbing_session = AsyncMock(return_value=None)
    mock_metering.update_dubbing_session = AsyncMock()
    mock_translate_init.return_value = None

    with pytest.raises(Exception, match="STT connection failed"):
        await dubbing_service.start()

    assert dubbing_service.is_running is False


# ============================================
# Reset Segment Time Tests
# ============================================

@pytest.mark.asyncio
async def test_reset_segment_time(dubbing_service, db_client):
    """Test resetting segment start time."""
    dubbing_service._current_segment_start_time = 12345.0

    dubbing_service._reset_segment_time()

    assert dubbing_service._current_segment_start_time is None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])
