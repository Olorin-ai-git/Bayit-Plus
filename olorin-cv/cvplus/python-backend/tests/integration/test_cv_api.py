"""
Integration Tests for CV API Endpoints
Tests full request/response cycle for CV operations
"""

import pytest
from io import BytesIO
from unittest.mock import AsyncMock, patch


def test_cv_upload_success(client, auth_headers):
    """Test successful CV upload"""
    # Create fake PDF file
    file_content = b"%PDF-1.4\nTest PDF content"
    files = {"file": ("test_cv.pdf", BytesIO(file_content), "application/pdf")}

    with patch('app.services.cv_service.CVService.upload_and_analyze') as mock_upload:
        from app.models import CV
        mock_cv = CV(
            id="test_cv_id",
            user_id="test_user",
            filename="test.pdf",
            original_filename="test.pdf",
            file_format="pdf",
            file_size_bytes=1024,
            storage_url="https://test.com/cv.pdf",
            status="processing"
        )
        mock_upload.return_value = mock_cv

        response = client.post(
            "/api/v1/cv/upload",
            files=files,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing"
        assert "job_id" in data


def test_cv_upload_unauthorized(client):
    """Test CV upload without authentication"""
    files = {"file": ("test.pdf", BytesIO(b"content"), "application/pdf")}

    response = client.post("/api/v1/cv/upload", files=files)

    assert response.status_code == 403  # Forbidden


def test_cv_analyze_success(client, auth_headers):
    """Test CV text analysis"""
    request_data = {
        "cv_text": "Experienced software engineer with Python and FastAPI skills",
        "language": "en"
    }

    with patch('app.services.ai_agent_service.AIAgentService.analyze_cv') as mock_analyze:
        mock_analyze.return_value = {
            "skills": ["Python", "FastAPI"],
            "experience_years": 5,
            "completeness_score": 85,
            "ats_score": 78,
            "recommendations": ["Add more details"],
            "missing_sections": []
        }

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

    with patch('app.services.cv_service.CVService.generate_cv') as mock_generate:
        from app.models import CV
        mock_cv = CV(
            id="generated_cv_id",
            user_id="test_user",
            filename="generated.txt",
            original_filename="Generated_CV_professional.txt",
            file_format="txt",
            file_size_bytes=500,
            storage_url="https://test.com/generated.txt",
            status="completed"
        )
        mock_generate.return_value = mock_cv

        response = client.post(
            "/api/v1/cv/generate",
            json=request_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "cv_url" in data


def test_cv_status_success(client, auth_headers):
    """Test get CV status"""
    job_id = "test_job_123"

    with patch('app.services.cv_service.CVService.get_cv') as mock_get:
        from app.models import CV
        mock_cv = CV(
            id=job_id,
            user_id="test_user",
            filename="test.pdf",
            original_filename="test.pdf",
            file_format="pdf",
            file_size_bytes=1024,
            storage_url="https://test.com/cv.pdf",
            status="completed"
        )
        mock_get.return_value = mock_cv

        response = client.get(
            f"/api/v1/cv/status/{job_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["progress"] == 100
        assert data["result_url"] is not None


def test_cv_status_not_found(client, auth_headers):
    """Test get CV status for nonexistent CV"""
    with patch('app.services.cv_service.CVService.get_cv') as mock_get:
        mock_get.return_value = None

        response = client.get(
            "/api/v1/cv/status/nonexistent",
            headers=auth_headers
        )

        assert response.status_code == 404


def test_cv_download_success(client, auth_headers):
    """Test CV download"""
    job_id = "test_job_123"

    with patch('app.services.cv_service.CVService.get_cv') as mock_get:
        with patch('app.services.storage_service.StorageService.get_signed_url') as mock_url:
            from app.models import CV
            mock_cv = CV(
                id=job_id,
                user_id="test_user",
                filename="test.pdf",
                original_filename="test.pdf",
                file_format="pdf",
                file_size_bytes=1024,
                storage_url="https://test.com/cv.pdf",
                status="completed"
            )
            mock_get.return_value = mock_cv
            mock_url.return_value = "https://signed-url.com/cv.pdf"

            response = client.get(
                f"/api/v1/cv/download/{job_id}",
                headers=auth_headers,
                follow_redirects=False
            )

            assert response.status_code == 302  # Redirect
            assert "https://signed-url.com/cv.pdf" in response.headers["location"]
