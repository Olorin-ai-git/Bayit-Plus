"""
Integration Tests for Upload Service

Tests the UploadService functionality including job queue management,
file hashing, metadata extraction, and GCS upload operations.
Uses real database operations with test collections.
"""

import asyncio
import hashlib
import os
import tempfile
from datetime import datetime
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
    from app.models.content import Content
    from app.models.upload import MonitoredFolder, UploadJob

    test_db_name = f"{settings.MONGODB_DB_NAME}_upload_test"
    mongodb_url = settings.MONGODB_URL

    client = AsyncIOMotorClient(mongodb_url)

    await init_beanie(
        database=client[test_db_name],
        document_models=[
            UploadJob,
            Content,
            MonitoredFolder,
        ],
    )

    yield client

    # Cleanup - drop test database
    await client.drop_database(test_db_name)
    client.close()


@pytest.fixture
def temp_video_file():
    """Create a temporary test file for upload testing."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        # Write some test data to create a file
        test_data = b"test video content " * 1000
        f.write(test_data)
        file_path = f.name

    yield file_path

    # Cleanup
    if os.path.exists(file_path):
        os.unlink(file_path)


@pytest.fixture
def temp_large_file():
    """Create a temporary large test file."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        # Write 1MB of test data
        test_data = b"x" * (1024 * 1024)
        f.write(test_data)
        file_path = f.name

    yield file_path

    # Cleanup
    if os.path.exists(file_path):
        os.unlink(file_path)


@pytest_asyncio.fixture
async def sample_upload_job(test_db_client, temp_video_file):
    """Create a sample upload job for testing."""
    from app.models.upload import ContentType, UploadJob, UploadStatus

    job = UploadJob(
        job_id=str(ObjectId()),
        type=ContentType.MOVIE,
        source_path=temp_video_file,
        filename=os.path.basename(temp_video_file),
        file_size=os.path.getsize(temp_video_file),
        status=UploadStatus.QUEUED,
        metadata={},
    )
    await job.insert()

    yield job

    # Cleanup
    try:
        await job.delete()
    except Exception:
        pass


class TestUploadServiceInit:
    """Tests for UploadService initialization."""

    def test_service_initialization(self):
        """Test service initializes correctly."""
        from app.services.upload_service import UploadService

        service = UploadService()

        assert service is not None
        assert service.processing is False
        assert service.current_job is None
        assert service._queue_paused is False

    def test_service_singleton_exists(self):
        """Test singleton instance is available."""
        from app.services.upload_service import upload_service

        assert upload_service is not None

    def test_service_has_required_methods(self):
        """Test service has all required methods."""
        from app.services.upload_service import UploadService

        service = UploadService()

        assert hasattr(service, "enqueue_upload")
        assert hasattr(service, "enqueue_multiple")
        assert hasattr(service, "process_queue")
        assert hasattr(service, "get_queue")
        assert hasattr(service, "get_job")
        assert hasattr(service, "cancel_job")
        assert hasattr(service, "get_queue_stats")
        assert hasattr(service, "clear_queue")
        assert hasattr(service, "resume_queue")


class TestUploadJobModel:
    """Tests for UploadJob model."""

    @pytest.mark.asyncio
    async def test_upload_job_creation(self, test_db_client, temp_video_file):
        """Test creating an upload job."""
        from app.models.upload import ContentType, UploadJob, UploadStatus

        job = UploadJob(
            job_id=str(ObjectId()),
            type=ContentType.MOVIE,
            source_path=temp_video_file,
            filename=os.path.basename(temp_video_file),
            file_size=os.path.getsize(temp_video_file),
            status=UploadStatus.QUEUED,
        )
        await job.insert()

        assert job.id is not None
        assert job.status == UploadStatus.QUEUED
        assert job.job_id is not None

        # Cleanup
        await job.delete()

    @pytest.mark.asyncio
    async def test_upload_job_status_enum(self, test_db_client):
        """Test UploadStatus enum values."""
        from app.models.upload import UploadStatus

        assert UploadStatus.QUEUED == "queued"
        assert UploadStatus.PROCESSING == "processing"
        assert UploadStatus.UPLOADING == "uploading"
        assert UploadStatus.COMPLETED == "completed"
        assert UploadStatus.FAILED == "failed"
        assert UploadStatus.CANCELLED == "cancelled"

    @pytest.mark.asyncio
    async def test_upload_job_content_type_enum(self, test_db_client):
        """Test ContentType enum values."""
        from app.models.upload import ContentType

        assert ContentType.MOVIE == "movie"
        assert ContentType.SERIES == "series"
        assert ContentType.PODCAST == "podcast"
        assert ContentType.AUDIOBOOK == "audiobook"

    @pytest.mark.asyncio
    async def test_upload_job_get_current_stage(self, test_db_client, sample_upload_job):
        """Test getting current stage from job."""
        current_stage = sample_upload_job.get_current_stage()

        assert current_stage is not None
        assert current_stage == "Queued"


class TestEnqueueUpload:
    """Tests for enqueueing uploads."""

    @pytest.mark.asyncio
    async def test_enqueue_upload_success(self, test_db_client, temp_video_file):
        """Test successfully enqueueing a file."""
        from app.models.upload import ContentType, UploadStatus
        from app.services.upload_service import UploadService

        service = UploadService()

        job = await service.enqueue_upload(
            source_path=temp_video_file,
            content_type=ContentType.MOVIE,
        )

        assert job is not None
        assert job.job_id is not None
        assert job.status == UploadStatus.QUEUED
        assert job.filename == os.path.basename(temp_video_file)

        # Cleanup
        await job.delete()

    @pytest.mark.asyncio
    async def test_enqueue_upload_file_not_found(self, test_db_client):
        """Test enqueueing non-existent file."""
        from app.models.upload import ContentType
        from app.services.upload_service import UploadService

        service = UploadService()

        with pytest.raises(FileNotFoundError):
            await service.enqueue_upload(
                source_path="/nonexistent/path/file.mp4",
                content_type=ContentType.MOVIE,
            )

    @pytest.mark.asyncio
    async def test_enqueue_upload_with_metadata(self, test_db_client, temp_video_file):
        """Test enqueueing with metadata."""
        from app.models.upload import ContentType
        from app.services.upload_service import UploadService

        service = UploadService()

        metadata = {
            "title": "Test Movie",
            "year": 2024,
            "genre": "Drama",
        }

        job = await service.enqueue_upload(
            source_path=temp_video_file,
            content_type=ContentType.MOVIE,
            metadata=metadata,
        )

        assert job is not None
        assert job.metadata.get("title") == "Test Movie"
        assert job.metadata.get("year") == 2024

        # Cleanup
        await job.delete()

    @pytest.mark.asyncio
    async def test_enqueue_upload_with_user_id(self, test_db_client, temp_video_file):
        """Test enqueueing with user ID."""
        from app.models.upload import ContentType
        from app.services.upload_service import UploadService

        service = UploadService()
        user_id = str(ObjectId())

        job = await service.enqueue_upload(
            source_path=temp_video_file,
            content_type=ContentType.MOVIE,
            user_id=user_id,
        )

        assert job is not None
        assert job.created_by == user_id

        # Cleanup
        await job.delete()


class TestEnqueueMultiple:
    """Tests for enqueueing multiple files."""

    @pytest.mark.asyncio
    async def test_enqueue_multiple_success(self, test_db_client):
        """Test enqueueing multiple files."""
        from app.models.upload import ContentType
        from app.services.upload_service import UploadService

        service = UploadService()

        # Create multiple temp files
        temp_files = []
        for i in range(3):
            with tempfile.NamedTemporaryFile(suffix=f"_{i}.mp4", delete=False) as f:
                f.write(f"test content {i}".encode())
                temp_files.append(f.name)

        try:
            jobs = await service.enqueue_multiple(
                file_paths=temp_files,
                content_type=ContentType.MOVIE,
            )

            assert len(jobs) == 3
            for job in jobs:
                assert job.job_id is not None

            # Cleanup jobs
            for job in jobs:
                await job.delete()
        finally:
            # Cleanup temp files
            for f in temp_files:
                if os.path.exists(f):
                    os.unlink(f)

    @pytest.mark.asyncio
    async def test_enqueue_multiple_partial_success(self, test_db_client, temp_video_file):
        """Test enqueueing with some invalid files."""
        from app.models.upload import ContentType
        from app.services.upload_service import UploadService

        service = UploadService()

        file_paths = [
            temp_video_file,
            "/nonexistent/file.mp4",
        ]

        jobs = await service.enqueue_multiple(
            file_paths=file_paths,
            content_type=ContentType.MOVIE,
        )

        # Should only enqueue the valid file
        assert len(jobs) == 1

        # Cleanup
        for job in jobs:
            await job.delete()


class TestGetQueue:
    """Tests for getting queue contents."""

    @pytest.mark.asyncio
    async def test_get_queue_empty(self, test_db_client):
        """Test getting empty queue."""
        from app.services.upload_service import UploadService

        service = UploadService()

        queue = await service.get_queue()

        assert isinstance(queue, list)

    @pytest.mark.asyncio
    async def test_get_queue_with_jobs(self, test_db_client, sample_upload_job):
        """Test getting queue with jobs."""
        from app.services.upload_service import UploadService

        service = UploadService()

        queue = await service.get_queue()

        assert len(queue) >= 1
        assert any(j.job_id == sample_upload_job.job_id for j in queue)


class TestGetJob:
    """Tests for getting specific jobs."""

    @pytest.mark.asyncio
    async def test_get_job_exists(self, test_db_client, sample_upload_job):
        """Test getting existing job."""
        from app.services.upload_service import UploadService

        service = UploadService()

        job = await service.get_job(sample_upload_job.job_id)

        assert job is not None
        assert job.job_id == sample_upload_job.job_id

    @pytest.mark.asyncio
    async def test_get_job_not_exists(self, test_db_client):
        """Test getting non-existent job."""
        from app.services.upload_service import UploadService

        service = UploadService()

        job = await service.get_job("nonexistent_job_id")

        assert job is None


class TestCancelJob:
    """Tests for cancelling jobs."""

    @pytest.mark.asyncio
    async def test_cancel_job_success(self, test_db_client, sample_upload_job):
        """Test cancelling a queued job."""
        from app.models.upload import UploadStatus
        from app.services.upload_service import UploadService

        service = UploadService()

        result = await service.cancel_job(sample_upload_job.job_id)

        assert result is True

        # Verify job is cancelled
        job = await service.get_job(sample_upload_job.job_id)
        assert job.status == UploadStatus.CANCELLED

    @pytest.mark.asyncio
    async def test_cancel_job_not_exists(self, test_db_client):
        """Test cancelling non-existent job."""
        from app.services.upload_service import UploadService

        service = UploadService()

        result = await service.cancel_job("nonexistent_job_id")

        assert result is False

    @pytest.mark.asyncio
    async def test_cancel_job_already_completed(self, test_db_client, sample_upload_job):
        """Test cancelling already completed job."""
        from app.models.upload import UploadStatus
        from app.services.upload_service import UploadService

        service = UploadService()

        # Mark job as completed
        sample_upload_job.status = UploadStatus.COMPLETED
        await sample_upload_job.save()

        result = await service.cancel_job(sample_upload_job.job_id)

        assert result is False


class TestClearQueue:
    """Tests for clearing the queue."""

    @pytest.mark.asyncio
    async def test_clear_queue(self, test_db_client, sample_upload_job):
        """Test clearing the upload queue."""
        from app.services.upload_service import UploadService

        service = UploadService()

        result = await service.clear_queue()

        assert result["success"] is True
        assert result["cancelled_count"] >= 1

    @pytest.mark.asyncio
    async def test_clear_queue_empty(self, test_db_client):
        """Test clearing empty queue."""
        from app.services.upload_service import UploadService

        service = UploadService()

        result = await service.clear_queue()

        assert result["success"] is True
        assert result["cancelled_count"] == 0


class TestGetQueueStats:
    """Tests for getting queue statistics."""

    @pytest.mark.asyncio
    async def test_get_queue_stats(self, test_db_client, sample_upload_job):
        """Test getting queue statistics."""
        from app.services.upload_service import UploadService

        service = UploadService()

        stats = await service.get_queue_stats()

        assert stats is not None
        assert hasattr(stats, "total_jobs")
        assert hasattr(stats, "queued")
        assert hasattr(stats, "processing")
        assert hasattr(stats, "completed")
        assert hasattr(stats, "failed")

        assert stats.queued >= 1

    @pytest.mark.asyncio
    async def test_get_queue_stats_empty(self, test_db_client):
        """Test getting stats for empty queue."""
        from app.services.upload_service import UploadService

        service = UploadService()

        stats = await service.get_queue_stats()

        assert stats is not None
        assert stats.queued >= 0


class TestFileHashCalculation:
    """Tests for file hash calculation."""

    @pytest.mark.asyncio
    async def test_calculate_file_hash(self, temp_video_file):
        """Test calculating file hash."""
        from app.services.upload_service import UploadService

        service = UploadService()

        # Calculate hash using service
        hash_result = await service._calculate_file_hash(temp_video_file)

        assert hash_result is not None
        assert len(hash_result) == 64  # SHA256 hex length

        # Verify hash is correct by calculating independently
        with open(temp_video_file, "rb") as f:
            expected_hash = hashlib.sha256(f.read()).hexdigest()

        assert hash_result == expected_hash

    @pytest.mark.asyncio
    async def test_calculate_file_hash_large_file(self, temp_large_file):
        """Test calculating hash for larger file."""
        from app.services.upload_service import UploadService

        service = UploadService()

        hash_result = await service._calculate_file_hash(temp_large_file)

        assert hash_result is not None
        assert len(hash_result) == 64


class TestResumeQueue:
    """Tests for resuming paused queue."""

    @pytest.mark.asyncio
    async def test_resume_queue(self, test_db_client):
        """Test resuming paused queue."""
        from app.services.upload_service import UploadService

        service = UploadService()

        # Pause the queue
        service._queue_paused = True
        service._pause_reason = "Test pause"

        # Resume
        await service.resume_queue()

        assert service._queue_paused is False
        assert service._pause_reason is None


class TestGetActiveJob:
    """Tests for getting active processing job."""

    @pytest.mark.asyncio
    async def test_get_active_job_none(self, test_db_client):
        """Test getting active job when none processing."""
        from app.services.upload_service import UploadService

        service = UploadService()

        active = await service.get_active_job()

        # May be None or an actual job depending on queue state
        assert active is None or active.status in ["processing", "uploading"]

    @pytest.mark.asyncio
    async def test_get_active_job_processing(self, test_db_client, sample_upload_job):
        """Test getting active job when one is processing."""
        from app.models.upload import UploadStatus
        from app.services.upload_service import UploadService

        service = UploadService()

        # Set job to processing
        sample_upload_job.status = UploadStatus.PROCESSING
        await sample_upload_job.save()

        active = await service.get_active_job()

        assert active is not None
        assert active.job_id == sample_upload_job.job_id


class TestGetRecentCompleted:
    """Tests for getting recently completed jobs."""

    @pytest.mark.asyncio
    async def test_get_recent_completed(self, test_db_client, sample_upload_job):
        """Test getting recently completed jobs."""
        from app.models.upload import UploadStatus
        from app.services.upload_service import UploadService

        service = UploadService()

        # Mark job as completed
        sample_upload_job.status = UploadStatus.COMPLETED
        sample_upload_job.completed_at = datetime.utcnow()
        await sample_upload_job.save()

        recent = await service.get_recent_completed(limit=10)

        assert len(recent) >= 1
        assert any(j.job_id == sample_upload_job.job_id for j in recent)

    @pytest.mark.asyncio
    async def test_get_recent_completed_limit(self, test_db_client):
        """Test limit on recent completed."""
        from app.services.upload_service import UploadService

        service = UploadService()

        recent = await service.get_recent_completed(limit=5)

        assert len(recent) <= 5


class TestWebsocketCallback:
    """Tests for WebSocket callback functionality."""

    def test_set_websocket_callback(self):
        """Test setting WebSocket callback."""
        from app.services.upload_service import UploadService

        service = UploadService()

        async def test_callback(message):
            pass

        service.set_websocket_callback(test_callback)

        assert service._websocket_callback == test_callback


class TestCredentialErrorDetection:
    """Tests for credential error detection."""

    def test_is_credential_error_true(self):
        """Test detecting credential-related errors."""
        from app.services.upload_service import UploadService

        service = UploadService()

        # Various credential error messages
        credential_errors = [
            Exception("DefaultCredentialsError: credentials were not found"),
            Exception("Could not automatically determine credentials"),
            Exception("Application Default Credentials are not available"),
            Exception("Authentication failed"),
            Exception("Invalid credentials provided"),
        ]

        for error in credential_errors:
            result = service._is_credential_error(error)
            assert result is True, f"Should detect: {error}"

    def test_is_credential_error_false(self):
        """Test non-credential errors are not flagged."""
        from app.services.upload_service import UploadService

        service = UploadService()

        non_credential_errors = [
            Exception("File not found"),
            Exception("Connection timeout"),
            Exception("Network error"),
            Exception("Invalid file format"),
        ]

        for error in non_credential_errors:
            result = service._is_credential_error(error)
            assert result is False, f"Should not detect: {error}"
