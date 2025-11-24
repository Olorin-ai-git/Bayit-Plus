"""
Integration Tests for Investigation Reports API
Feature: 001-extensive-investigation-report
Task: T058

Tests the complete API endpoints for investigation report generation and retrieval.
"""

import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app


@pytest.fixture
def client():
    """Create FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_investigation_folder(tmp_path):
    """Create a mock investigation folder with test data."""
    investigation_id = "test-inv-456"
    investigation_folder = tmp_path / investigation_id
    investigation_folder.mkdir()

    # Create comprehensive report HTML
    report_html = """
    <html>
    <head><title>Investigation Report</title></head>
    <body>
        <h1>Comprehensive Investigation Report</h1>
        <div class="executive-summary">Executive Summary Content</div>
        <div class="risk-dashboard">Risk Dashboard Content</div>
        <div class="agent-explanations">Agent Explanations Content</div>
    </body>
    </html>
    """
    (investigation_folder / "comprehensive_investigation_report.html").write_text(report_html)
    (investigation_folder / "investigation_state_initial.json").write_text(
        '{"investigation_id": "test-inv-456"}'
    )

    return str(tmp_path), investigation_id, report_html


class TestInvestigationReportsGenerateEndpoint:
    """Test suite for POST /api/v1/reports/investigation/generate"""

    def test_generate_report_success(self, client, mock_investigation_folder):
        """Test successful report generation via API."""
        base_logs_dir, investigation_id, _ = mock_investigation_folder

        with patch.dict(os.environ, {"INVESTIGATION_LOGS_DIR": base_logs_dir}):
            with patch(
                'app.service.report_service.ComprehensiveInvestigationReportGenerator'
            ) as mock_generator_class:
                mock_generator = MagicMock()
                mock_generator.generate_comprehensive_report.return_value = None
                mock_generator_class.return_value = mock_generator

                response = client.post(
                    "/api/v1/reports/investigation/generate",
                    json={
                        "investigation_id": investigation_id,
                        "title": "API Test Report"
                    }
                )

                assert response.status_code == 201
                data = response.json()
                assert data["investigation_id"] == investigation_id
                assert data["title"] == "API Test Report"
                assert "report_path" in data
                assert "file_size_bytes" in data
                assert data["file_size_bytes"] > 0

    def test_generate_report_missing_investigation_id(self, client):
        """Test error handling when investigation_id is missing."""
        response = client.post(
            "/api/v1/reports/investigation/generate",
            json={"title": "Missing ID Report"}
        )

        assert response.status_code == 422  # Validation error

    def test_generate_report_investigation_not_found(self, client):
        """Test error handling when investigation folder doesn't exist."""
        with patch.dict(os.environ, {"INVESTIGATION_LOGS_DIR": "/nonexistent"}):
            response = client.post(
                "/api/v1/reports/investigation/generate",
                json={
                    "investigation_id": "nonexistent-investigation",
                    "title": "Should Fail"
                }
            )

            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_generate_report_requires_authentication(self, client):
        """Test that endpoint requires authentication."""
        # Test without auth token (in production, should fail)
        # Note: This test assumes authentication is enabled
        with patch('app.security.auth.require_read_or_dev') as mock_auth:
            mock_auth.side_effect = Exception("Authentication required")

            with pytest.raises(Exception, match="Authentication required"):
                client.post(
                    "/api/v1/reports/investigation/generate",
                    json={
                        "investigation_id": "test-id",
                        "title": "Test"
                    }
                )


class TestInvestigationReportsRetrieveEndpoint:
    """Test suite for GET /api/v1/reports/investigation/{investigation_id}/html"""

    def test_retrieve_report_success(self, client, mock_investigation_folder):
        """Test successful report retrieval via API."""
        base_logs_dir, investigation_id, expected_html = mock_investigation_folder

        with patch.dict(os.environ, {"INVESTIGATION_LOGS_DIR": base_logs_dir}):
            response = client.get(
                f"/api/v1/reports/investigation/{investigation_id}/html"
            )

            assert response.status_code == 200
            assert response.headers["content-type"] == "text/html; charset=utf-8"
            assert "Investigation Report" in response.text
            assert "Executive Summary" in response.text

    def test_retrieve_report_not_found(self, client):
        """Test error handling when report doesn't exist."""
        with patch.dict(os.environ, {"INVESTIGATION_LOGS_DIR": "/nonexistent"}):
            response = client.get(
                "/api/v1/reports/investigation/nonexistent-investigation/html"
            )

            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_retrieve_report_correct_filename(self, client, mock_investigation_folder):
        """Test that report is served with correct filename."""
        base_logs_dir, investigation_id, _ = mock_investigation_folder

        with patch.dict(os.environ, {"INVESTIGATION_LOGS_DIR": base_logs_dir}):
            response = client.get(
                f"/api/v1/reports/investigation/{investigation_id}/html"
            )

            assert response.status_code == 200
            # Check Content-Disposition header for filename
            content_disposition = response.headers.get("content-disposition", "")
            assert investigation_id in content_disposition


class TestInvestigationReportsEndToEnd:
    """End-to-end tests for complete report workflow."""

    def test_generate_and_retrieve_workflow(self, client, mock_investigation_folder):
        """Test complete workflow: generate report then retrieve it."""
        base_logs_dir, investigation_id, _ = mock_investigation_folder

        with patch.dict(os.environ, {"INVESTIGATION_LOGS_DIR": base_logs_dir}):
            with patch(
                'app.service.report_service.ComprehensiveInvestigationReportGenerator'
            ) as mock_generator_class:
                mock_generator = MagicMock()
                mock_generator.generate_comprehensive_report.return_value = None
                mock_generator_class.return_value = mock_generator

                # Step 1: Generate report
                generate_response = client.post(
                    "/api/v1/reports/investigation/generate",
                    json={
                        "investigation_id": investigation_id,
                        "title": "E2E Test Report"
                    }
                )

                assert generate_response.status_code == 201
                report_data = generate_response.json()

                # Step 2: Retrieve the generated report
                retrieve_response = client.get(
                    f"/api/v1/reports/investigation/{investigation_id}/html"
                )

                assert retrieve_response.status_code == 200
                assert "Investigation Report" in retrieve_response.text

    def test_multiple_report_generations(self, client, mock_investigation_folder):
        """Test generating report multiple times for the same investigation."""
        base_logs_dir, investigation_id, _ = mock_investigation_folder

        with patch.dict(os.environ, {"INVESTIGATION_LOGS_DIR": base_logs_dir}):
            with patch(
                'app.service.report_service.ComprehensiveInvestigationReportGenerator'
            ) as mock_generator_class:
                mock_generator = MagicMock()
                mock_generator.generate_comprehensive_report.return_value = None
                mock_generator_class.return_value = mock_generator

                # Generate report twice
                response1 = client.post(
                    "/api/v1/reports/investigation/generate",
                    json={"investigation_id": investigation_id, "title": "Report 1"}
                )
                response2 = client.post(
                    "/api/v1/reports/investigation/generate",
                    json={"investigation_id": investigation_id, "title": "Report 2"}
                )

                assert response1.status_code == 201
                assert response2.status_code == 201

                # Both should succeed (report overwrites previous)
                assert response2.json()["title"] == "Report 2"
