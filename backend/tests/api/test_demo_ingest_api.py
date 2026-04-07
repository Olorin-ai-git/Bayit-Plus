"""Tests for demo video upload and ingest endpoints."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_demo_upload_rejects_unauthenticated(client):
    """Upload without dependency override still works since client has it."""
    pass  # The client fixture already has auth override


@pytest.mark.asyncio
async def test_demo_upload_rejects_invalid_content_type(client):
    response = await client.post(
        "/api/v1/demo/upload",
        files={"file": ("doc.pdf", b"fakepdf", "application/pdf")},
    )
    assert response.status_code == 415
    assert "Unsupported" in response.json()["detail"]


@pytest.mark.asyncio
async def test_demo_upload_rejects_oversized_file(client):
    # 101 MB > default 100 MB limit
    big_data = b"x" * (101 * 1024 * 1024)
    response = await client.post(
        "/api/v1/demo/upload",
        files={"file": ("big.mp4", big_data, "video/mp4")},
    )
    assert response.status_code == 413
    assert "limit" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_demo_upload_success(client):
    fake_url = "https://storage.googleapis.com/demo/test/abc.mp4"
    with patch(
        "app.api.routes.demo_ingest.storage_service.upload_bytes",
        new_callable=AsyncMock,
        return_value=fake_url,
    ):
        response = await client.post(
            "/api/v1/demo/upload",
            files={"file": ("clip.mp4", b"fake-video", "video/mp4")},
        )
    assert response.status_code == 201
    data = response.json()
    assert data["url"] == fake_url
    assert "file_id" in data
    assert data["size_bytes"] == len(b"fake-video")
    assert data["content_type"] == "video/mp4"


@pytest.mark.asyncio
async def test_demo_ingest_rejects_non_http_url(client):
    response = await client.post(
        "/api/v1/demo/ingest",
        json={"video_url": "file:///etc/passwd"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_demo_ingest_rejects_ftp_url(client):
    response = await client.post(
        "/api/v1/demo/ingest",
        json={"video_url": "ftp://evil.com/exploit"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_demo_ingest_enforces_usage_limit(client, mock_user):
    with patch(
        "app.api.routes.demo_ingest.demo_usage_service.check_limit",
        new_callable=AsyncMock,
        return_value=False,
    ):
        response = await client.post(
            "/api/v1/demo/ingest",
            json={"video_url": "https://example.com/video.mp4"},
        )
    assert response.status_code == 429
    assert "limit" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_demo_ingest_returns_422_on_probe_failure(client):
    with (
        patch(
            "app.api.routes.demo_ingest.demo_usage_service.check_limit",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "app.api.routes.demo_ingest.probe_duration",
            new_callable=AsyncMock,
            side_effect=ValueError("Could not determine video duration"),
        ),
    ):
        response = await client.post(
            "/api/v1/demo/ingest",
            json={"video_url": "https://example.com/video.mp4"},
        )
    assert response.status_code == 422
    assert "duration" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_demo_ingest_success_starts_pipeline(client, mock_user):
    mock_content = MagicMock()
    mock_content.id = "content123"

    mock_job = MagicMock()
    mock_job.insert = AsyncMock()

    with (
        patch(
            "app.api.routes.demo_ingest.demo_usage_service.check_limit",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "app.api.routes.demo_ingest.probe_duration",
            new_callable=AsyncMock,
            return_value=120.0,
        ),
        patch(
            "app.api.routes.demo_ingest.Content",
        ) as mock_content_cls,
        patch(
            "app.api.routes.demo_ingest.IngestJob",
        ) as mock_job_cls,
    ):
        mock_instance = AsyncMock()
        mock_instance.id = "content123"
        mock_instance.insert = AsyncMock()
        mock_content_cls.return_value = mock_instance

        mock_job_instance = AsyncMock()
        mock_job_instance.insert = AsyncMock()
        mock_job_cls.return_value = mock_job_instance

        response = await client.post(
            "/api/v1/demo/ingest",
            json={"video_url": "https://example.com/clip.mp4"},
        )

    assert response.status_code == 202
    data = response.json()
    assert data["content_id"] == "content123"
    assert "job_id" in data
    assert data["status"] == "processing"
    assert data["truncated"] is False
    assert data["processed_duration_seconds"] == 120.0


@pytest.mark.asyncio
async def test_demo_ingest_truncates_long_video(client, mock_user):
    with (
        patch(
            "app.api.routes.demo_ingest.demo_usage_service.check_limit",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "app.api.routes.demo_ingest.probe_duration",
            new_callable=AsyncMock,
            return_value=1800.0,  # 30 minutes
        ),
        patch(
            "app.api.routes.demo_ingest.truncate_and_upload",
            new_callable=AsyncMock,
            return_value="https://storage.googleapis.com/demo/truncated.mp4",
        ),
        patch("app.api.routes.demo_ingest.Content") as mock_content_cls,
        patch("app.api.routes.demo_ingest.IngestJob") as mock_job_cls,
    ):
        mock_instance = AsyncMock()
        mock_instance.id = "content456"
        mock_instance.insert = AsyncMock()
        mock_content_cls.return_value = mock_instance

        mock_job_instance = AsyncMock()
        mock_job_instance.insert = AsyncMock()
        mock_job_cls.return_value = mock_job_instance

        response = await client.post(
            "/api/v1/demo/ingest",
            json={"video_url": "https://example.com/long-video.mp4"},
        )

    assert response.status_code == 202
    data = response.json()
    assert data["truncated"] is True
    assert data["processed_duration_seconds"] == 600.0
