"""
Integration Tests for Live Recording Service

Tests the LiveRecordingService functionality including recording session
management, FFmpeg integration, and user quota handling.
Uses real database operations with test collections.
"""

import asyncio
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import pytest
import pytest_asyncio
from beanie import init_beanie
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings


@pytest_asyncio.fixture
async def test_db_client():
    """Create test database client with required models."""
    from app.models.content import LiveChannel
    from app.models.recording import Recording, RecordingQuota, RecordingSession
    from app.models.user import User

    test_db_name = f"{settings.MONGODB_DB_NAME}_live_recording_test"
    mongodb_url = settings.MONGODB_URL

    client = AsyncIOMotorClient(mongodb_url)

    await init_beanie(
        database=client[test_db_name],
        document_models=[
            LiveChannel,
            RecordingSession,
            Recording,
            User,
        ],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def sample_user(test_db_client):
    """Create a sample user for testing."""
    from app.models.recording import RecordingQuota
    from app.models.user import User

    user = User(
        email="test_recorder@example.com",
        name="Test Recorder",
        hashed_password="hashed_test_password",
        is_active=True,
        is_verified=True,
        recording_quota=RecordingQuota(
            max_storage_bytes=10 * 1024 * 1024 * 1024,  # 10GB
            used_storage_bytes=0,
            max_recording_duration_seconds=3600,  # 1 hour
            max_concurrent_recordings=1,
        ),
    )
    await user.insert()

    yield user

    # Cleanup
    try:
        await user.delete()
    except Exception:
        pass


@pytest_asyncio.fixture
async def sample_channel(test_db_client):
    """Create a sample live channel for testing."""
    from app.models.content import LiveChannel

    channel = LiveChannel(
        name="Test Channel",
        name_en="Test Channel",
        description="A test live channel",
        description_en="A test live channel",
        stream_url="https://test-stream.example.com/live.m3u8",
        is_active=True,
        category="entertainment",
    )
    await channel.insert()

    yield channel

    # Cleanup
    try:
        await channel.delete()
    except Exception:
        pass


@pytest_asyncio.fixture
async def sample_recording_session(test_db_client, sample_user, sample_channel):
    """Create a sample recording session for testing."""
    from app.models.recording import RecordingSession

    session = RecordingSession(
        user_id=str(sample_user.id),
        channel_id=str(sample_channel.id),
        channel_name=sample_channel.name,
        stream_url=sample_channel.stream_url,
        status="recording",
        output_path="/tmp/recordings/test_recording.mp4",
        ffmpeg_pid=None,
        started_at=datetime.utcnow(),
        trigger_type="manual",
    )
    await session.insert()

    yield session

    # Cleanup
    try:
        await session.delete()
    except Exception:
        pass


class TestLiveRecordingServiceInit:
    """Tests for LiveRecordingService initialization."""

    def test_service_initialization(self):
        """Test service initializes correctly."""
        from app.services.live_recording_service import LiveRecordingService

        service = LiveRecordingService()

        assert service is not None
        assert hasattr(service, "temp_dir")
        assert service.temp_dir.exists() or service.temp_dir.parent.exists()

    def test_service_singleton_exists(self):
        """Test singleton instance is available."""
        from app.services.live_recording_service import live_recording_service

        assert live_recording_service is not None

    def test_service_temp_directory_structure(self):
        """Test temp directory is properly set up."""
        from app.services.live_recording_service import LiveRecordingService

        service = LiveRecordingService()

        # Temp dir should be a Path object
        assert isinstance(service.temp_dir, Path)


class TestRecordingSessionModel:
    """Tests for RecordingSession model."""

    @pytest.mark.asyncio
    async def test_recording_session_creation(self, test_db_client, sample_user, sample_channel):
        """Test creating a recording session."""
        from app.models.recording import RecordingSession

        session = RecordingSession(
            user_id=str(sample_user.id),
            channel_id=str(sample_channel.id),
            channel_name=sample_channel.name,
            stream_url=sample_channel.stream_url,
            status="recording",
            output_path="/tmp/test.mp4",
        )
        await session.insert()

        assert session.id is not None
        assert session.user_id == str(sample_user.id)
        assert session.status == "recording"

        # Cleanup
        await session.delete()

    @pytest.mark.asyncio
    async def test_recording_session_fields(self, test_db_client, sample_recording_session):
        """Test recording session has all required fields."""
        session = sample_recording_session

        assert hasattr(session, "user_id")
        assert hasattr(session, "channel_id")
        assert hasattr(session, "channel_name")
        assert hasattr(session, "recording_id")
        assert hasattr(session, "stream_url")
        assert hasattr(session, "status")
        assert hasattr(session, "output_path")
        assert hasattr(session, "ffmpeg_pid")
        assert hasattr(session, "trigger_type")

    @pytest.mark.asyncio
    async def test_recording_session_subtitle_fields(self, test_db_client, sample_recording_session):
        """Test recording session has subtitle-related fields."""
        session = sample_recording_session

        assert hasattr(session, "subtitle_enabled")
        assert hasattr(session, "subtitle_target_language")
        assert hasattr(session, "subtitle_cues_count")


class TestRecordingModel:
    """Tests for Recording model."""

    @pytest.mark.asyncio
    async def test_recording_from_session(self, test_db_client, sample_recording_session):
        """Test creating Recording from completed session."""
        from app.models.recording import Recording

        # Update session to completed state
        sample_recording_session.status = "completed"
        sample_recording_session.actual_end_at = datetime.utcnow()
        sample_recording_session.duration_seconds = 300
        sample_recording_session.file_size_bytes = 1024 * 1024

        recording = Recording.from_session(
            sample_recording_session,
            video_url="https://storage.example.com/recording.mp4",
            file_size=1024 * 1024,
        )

        assert recording is not None
        assert recording.user_id == sample_recording_session.user_id
        assert recording.channel_id == sample_recording_session.channel_id
        assert recording.duration_seconds == 300

    @pytest.mark.asyncio
    async def test_recording_fields(self, test_db_client, sample_user, sample_channel):
        """Test Recording has all required fields."""
        from app.models.recording import Recording

        recording = Recording(
            id=str(ObjectId()),
            user_id=str(sample_user.id),
            channel_id=str(sample_channel.id),
            channel_name=sample_channel.name,
            title="Test Recording",
            video_url="https://storage.example.com/test.mp4",
            started_at=datetime.utcnow() - timedelta(minutes=10),
            ended_at=datetime.utcnow(),
            duration_seconds=600,
            file_size_bytes=10 * 1024 * 1024,
            auto_delete_at=datetime.utcnow() + timedelta(days=30),
        )

        assert hasattr(recording, "user_id")
        assert hasattr(recording, "channel_id")
        assert hasattr(recording, "title")
        assert hasattr(recording, "video_url")
        assert hasattr(recording, "duration_seconds")
        assert hasattr(recording, "file_size_bytes")
        assert hasattr(recording, "auto_delete_at")


class TestGetActiveSession:
    """Tests for getting active recording sessions."""

    @pytest.mark.asyncio
    async def test_get_active_session_exists(
        self, test_db_client, sample_user, sample_recording_session
    ):
        """Test getting an active session for a user."""
        from app.services.live_recording_service import live_recording_service

        session = await live_recording_service.get_active_session(
            user_id=str(sample_user.id)
        )

        assert session is not None
        assert session.user_id == str(sample_user.id)
        assert session.status == "recording"

    @pytest.mark.asyncio
    async def test_get_active_session_not_exists(self, test_db_client, sample_user):
        """Test getting active session when none exists."""
        from app.services.live_recording_service import live_recording_service

        session = await live_recording_service.get_active_session(
            user_id=str(sample_user.id)
        )

        # Should return None since no active session
        assert session is None

    @pytest.mark.asyncio
    async def test_get_active_session_by_channel(
        self, test_db_client, sample_user, sample_channel, sample_recording_session
    ):
        """Test getting active session filtered by channel."""
        from app.services.live_recording_service import live_recording_service

        session = await live_recording_service.get_active_session(
            user_id=str(sample_user.id),
            channel_id=str(sample_channel.id),
        )

        if session is not None:
            assert session.channel_id == str(sample_channel.id)


class TestUpdateSessionProgress:
    """Tests for updating recording session progress."""

    @pytest.mark.asyncio
    async def test_update_session_progress(
        self, test_db_client, sample_recording_session
    ):
        """Test updating session progress."""
        from app.models.recording import RecordingSession
        from app.services.live_recording_service import live_recording_service

        await live_recording_service.update_session_progress(
            session_id=str(sample_recording_session.id),
            duration_seconds=120,
            file_size_bytes=5 * 1024 * 1024,
        )

        # Reload session from database
        updated = await RecordingSession.get(sample_recording_session.id)

        assert updated is not None
        assert updated.duration_seconds == 120
        assert updated.file_size_bytes == 5 * 1024 * 1024

    @pytest.mark.asyncio
    async def test_update_session_progress_nonexistent(self, test_db_client):
        """Test updating progress for non-existent session."""
        from app.services.live_recording_service import live_recording_service

        # Should not raise an exception
        await live_recording_service.update_session_progress(
            session_id=str(ObjectId()),
            duration_seconds=100,
            file_size_bytes=1024,
        )


class TestHandleRecordingError:
    """Tests for handling recording errors."""

    @pytest.mark.asyncio
    async def test_handle_recording_error(
        self, test_db_client, sample_recording_session
    ):
        """Test handling a recording error."""
        from app.models.recording import RecordingSession
        from app.services.live_recording_service import live_recording_service

        error = Exception("Test error: Connection lost")

        await live_recording_service.handle_recording_error(
            session_id=str(sample_recording_session.id),
            error=error,
        )

        # Reload session from database
        updated = await RecordingSession.get(sample_recording_session.id)

        assert updated is not None
        assert updated.status == "failed"
        assert "Connection lost" in updated.error_message

    @pytest.mark.asyncio
    async def test_handle_recording_error_nonexistent(self, test_db_client):
        """Test handling error for non-existent session."""
        from app.services.live_recording_service import live_recording_service

        error = Exception("Test error")

        # Should not raise an exception
        await live_recording_service.handle_recording_error(
            session_id=str(ObjectId()),
            error=error,
        )


class TestRecordingQuotaIntegration:
    """Tests for recording quota integration."""

    @pytest.mark.asyncio
    async def test_user_has_recording_quota(self, test_db_client, sample_user):
        """Test user has recording quota field."""
        from app.models.user import User

        user = await User.get(sample_user.id)

        assert user is not None
        assert hasattr(user, "recording_quota")
        assert user.recording_quota is not None
        assert hasattr(user.recording_quota, "has_storage_available")

    @pytest.mark.asyncio
    async def test_recording_quota_has_storage_check(self, test_db_client, sample_user):
        """Test quota storage availability check."""
        from app.models.user import User

        user = await User.get(sample_user.id)

        # Fresh user should have storage available
        assert user.recording_quota.has_storage_available() is True

    @pytest.mark.asyncio
    async def test_recording_quota_exceeds_limit(self, test_db_client, sample_user):
        """Test quota detection when storage is exceeded."""
        from app.models.user import User

        user = await User.get(sample_user.id)

        # Set used storage to exceed max
        user.recording_quota.used_storage_bytes = (
            user.recording_quota.max_storage_bytes + 1
        )
        await user.save()

        # Reload user
        user = await User.get(sample_user.id)

        assert user.recording_quota.has_storage_available() is False


class TestStartRecordingValidation:
    """Tests for start recording validation logic."""

    @pytest.mark.asyncio
    async def test_start_recording_user_not_found(
        self, test_db_client, sample_channel
    ):
        """Test starting recording with non-existent user."""
        from app.services.live_recording_service import live_recording_service

        with pytest.raises(Exception) as exc_info:
            await live_recording_service.start_recording(
                user_id=str(ObjectId()),
                channel_id=str(sample_channel.id),
                stream_url=sample_channel.stream_url,
            )

        assert "not found" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_start_recording_channel_not_found(
        self, test_db_client, sample_user
    ):
        """Test starting recording with non-existent channel."""
        from app.services.live_recording_service import live_recording_service

        with pytest.raises(Exception) as exc_info:
            await live_recording_service.start_recording(
                user_id=str(sample_user.id),
                channel_id=str(ObjectId()),
                stream_url="https://example.com/stream.m3u8",
            )

        assert "not found" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_start_recording_already_active(
        self, test_db_client, sample_user, sample_channel, sample_recording_session
    ):
        """Test starting recording when one is already active."""
        from app.services.live_recording_service import live_recording_service

        with pytest.raises(Exception) as exc_info:
            await live_recording_service.start_recording(
                user_id=str(sample_user.id),
                channel_id=str(sample_channel.id),
                stream_url=sample_channel.stream_url,
            )

        assert "already in progress" in str(exc_info.value).lower()


class TestStopRecordingValidation:
    """Tests for stop recording validation logic."""

    @pytest.mark.asyncio
    async def test_stop_recording_session_not_found(
        self, test_db_client, sample_user
    ):
        """Test stopping non-existent session."""
        from app.services.live_recording_service import live_recording_service

        with pytest.raises(Exception) as exc_info:
            await live_recording_service.stop_recording(
                session_id=str(ObjectId()),
                user_id=str(sample_user.id),
            )

        assert "not found" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_stop_recording_unauthorized(
        self, test_db_client, sample_recording_session
    ):
        """Test stopping recording by unauthorized user."""
        from app.services.live_recording_service import live_recording_service

        # Use a different user ID
        with pytest.raises(Exception) as exc_info:
            await live_recording_service.stop_recording(
                session_id=str(sample_recording_session.id),
                user_id=str(ObjectId()),
            )

        assert "not authorized" in str(exc_info.value).lower()


class TestRecordingTriggerTypes:
    """Tests for different recording trigger types."""

    @pytest.mark.asyncio
    async def test_manual_trigger_type(self, test_db_client, sample_recording_session):
        """Test manual trigger type is set correctly."""
        assert sample_recording_session.trigger_type == "manual"

    @pytest.mark.asyncio
    async def test_scheduled_trigger_type(self, test_db_client, sample_user, sample_channel):
        """Test scheduled trigger type."""
        from app.models.recording import RecordingSession

        session = RecordingSession(
            user_id=str(sample_user.id),
            channel_id=str(sample_channel.id),
            channel_name=sample_channel.name,
            stream_url=sample_channel.stream_url,
            status="recording",
            output_path="/tmp/scheduled_recording.mp4",
            trigger_type="scheduled",
            schedule_id=str(ObjectId()),
        )
        await session.insert()

        assert session.trigger_type == "scheduled"
        assert session.schedule_id is not None

        # Cleanup
        await session.delete()


class TestRecordingSessionStatus:
    """Tests for recording session status transitions."""

    @pytest.mark.asyncio
    async def test_session_status_values(self, test_db_client, sample_recording_session):
        """Test valid session status values."""
        from app.models.recording import RecordingSession

        valid_statuses = ["recording", "processing", "completed", "failed", "cancelled"]

        for status in valid_statuses:
            sample_recording_session.status = status
            await sample_recording_session.save()

            # Reload and verify
            session = await RecordingSession.get(sample_recording_session.id)
            assert session.status == status

    @pytest.mark.asyncio
    async def test_session_status_to_processing(self, test_db_client, sample_recording_session):
        """Test transitioning from recording to processing."""
        from app.models.recording import RecordingSession

        sample_recording_session.status = "processing"
        sample_recording_session.actual_end_at = datetime.utcnow()
        await sample_recording_session.save()

        session = await RecordingSession.get(sample_recording_session.id)
        assert session.status == "processing"
        assert session.actual_end_at is not None

    @pytest.mark.asyncio
    async def test_session_status_to_completed(self, test_db_client, sample_recording_session):
        """Test transitioning to completed status."""
        from app.models.recording import RecordingSession

        sample_recording_session.status = "completed"
        sample_recording_session.actual_end_at = datetime.utcnow()
        sample_recording_session.duration_seconds = 600
        sample_recording_session.file_size_bytes = 50 * 1024 * 1024
        await sample_recording_session.save()

        session = await RecordingSession.get(sample_recording_session.id)
        assert session.status == "completed"
        assert session.duration_seconds == 600
