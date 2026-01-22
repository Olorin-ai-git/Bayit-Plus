"""
Integration Tests for CV API Endpoints
Tests full request/response cycle for CV operations
"""

import pytest
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock

from bson import ObjectId

from app.main import app
from app.api.cv import get_cv_service


def create_mock_cv(
    cv_id: str = None,
    user_id: str = "test_user",
    status: str = "processing",
    storage_url: str = "https://test.com/cv.pdf"
):
    """Create a mock CV object for testing."""
    mock_cv = MagicMock()
    mock_cv.id = ObjectId(cv_id) if cv_id else ObjectId()
    mock_cv.user_id = user_id
    mock_cv.filename = "test.pdf"
    mock_cv.original_filename = "test.pdf"
    mock_cv.file_format = "pdf"
    mock_cv.file_size_bytes = 1024
    mock_cv.storage_url = storage_url
    mock_cv.status = status
    mock_cv.structured_data = None
    mock_cv.processing_error = None
    return mock_cv


def create_mock_cv_service():
    """Create a mock CV service."""
    mock_service = MagicMock()
    mock_service.upload_and_analyze = AsyncMock()
    mock_service.generate_cv = AsyncMock()
    mock_service.get_cv = AsyncMock()
    mock_service.get_analysis = AsyncMock()
    return mock_service


def test_cv_upload_success(client, auth_headers):
    """Test successful CV upload"""
    file_content = b"%PDF-1.4\nTest PDF content"
    files = {"file": ("test_cv.pdf", BytesIO(file_content), "application/pdf")}

    mock_cv = create_mock_cv(status="processing")
    mock_service = create_mock_cv_service()
    mock_service.upload_and_analyze.return_value = mock_cv

    app.dependency_overrides[get_cv_service] = lambda: mock_service

    try:
        response = client.post(
            "/api/v1/cv/upload",
            files=files,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing"
        assert "job_id" in data
    finally:
        app.dependency_overrides.clear()


def test_cv_upload_unauthorized(client):
    """Test CV upload without authentication"""
    files = {"file": ("test.pdf", BytesIO(b"content"), "application/pdf")}

    response = client.post("/api/v1/cv/upload", files=files)

    assert response.status_code == 403


def test_cv_analyze_success(client, auth_headers):
    """Test CV text analysis"""
    request_data = {
        "cv_text": "Experienced software engineer with Python and FastAPI skills",
        "language": "en"
    }

    mock_analysis = {
        "skills": ["Python", "FastAPI"],
        "experience_years": 5,
        "completeness_score": 85,
        "ats_score": 78,
        "recommendations": ["Add more details"],
        "missing_sections": []
    }

    from unittest.mock import patch

    with patch('app.api.cv.AIAgentService') as mock_ai_class:
        mock_ai = MagicMock()
        mock_ai.analyze_cv = AsyncMock(return_value=mock_analysis)
        mock_ai_class.return_value = mock_ai

        response = client.post(
            "/api/v1/cv/analyze",
            json=request_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "analysis" in data
        assert data["analysis"]["skills"] == ["Python", "FastAPI"]


def test_cv_generate_success(client, auth_headers):
    """Test CV generation"""
    request_data = {
        "user_data": {
            "name": "John Doe",
            "email": "john@example.com",
            "skills": ["Python", "FastAPI"]
        },
        "template": "professional",
        "language": "en"
    }

    mock_cv = create_mock_cv(status="completed", storage_url="https://test.com/generated.txt")
    mock_service = create_mock_cv_service()
    mock_service.generate_cv.return_value = mock_cv

    app.dependency_overrides[get_cv_service] = lambda: mock_service

    try:
        response = client.post(
            "/api/v1/cv/generate",
            json=request_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "cv_url" in data
    finally:
        app.dependency_overrides.clear()


def test_cv_status_success(client, auth_headers):
    """Test get CV status"""
    job_id = str(ObjectId())
    mock_cv = create_mock_cv(cv_id=job_id, status="completed")

    mock_service = create_mock_cv_service()
    mock_service.get_cv.return_value = mock_cv

    app.dependency_overrides[get_cv_service] = lambda: mock_service

    try:
        response = client.get(
            f"/api/v1/cv/status/{job_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["progress"] == 100
        assert data["result_url"] is not None
    finally:
        app.dependency_overrides.clear()


def test_cv_status_not_found(client, auth_headers):
    """Test get CV status for nonexistent CV"""
    mock_service = create_mock_cv_service()
    mock_service.get_cv.return_value = None

    app.dependency_overrides[get_cv_service] = lambda: mock_service

    try:
        response = client.get(
            "/api/v1/cv/status/507f1f77bcf86cd799439011",
            headers=auth_headers
        )

        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_cv_download_success(client, auth_headers):
    """Test CV download"""
    from unittest.mock import patch

    job_id = str(ObjectId())
    mock_cv = create_mock_cv(cv_id=job_id, status="completed")

    mock_service = create_mock_cv_service()
    mock_service.get_cv.return_value = mock_cv

    app.dependency_overrides[get_cv_service] = lambda: mock_service

    try:
        with patch('app.api.cv.StorageService') as mock_storage_class:
            mock_storage = MagicMock()
            mock_storage.get_signed_url = AsyncMock(
                return_value="https://signed-url.com/cv.pdf"
            )
            mock_storage_class.return_value = mock_storage

            response = client.get(
                f"/api/v1/cv/download/{job_id}",
                headers=auth_headers,
                follow_redirects=False
            )

            assert response.status_code == 302
            assert "https://signed-url.com/cv.pdf" in response.headers["location"]
    finally:
        app.dependency_overrides.clear()
