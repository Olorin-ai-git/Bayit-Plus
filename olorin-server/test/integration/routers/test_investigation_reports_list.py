"""
Integration Tests for Investigation Reports List API
Feature: 001-extensive-investigation-report
Task: T077

Tests the GET /api/v1/reports/investigation/ endpoint with filtering,
pagination, and search functionality.
"""

import os
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client for FastAPI application."""
    return TestClient(app)


@pytest.fixture
def mock_investigation_reports(tmp_path):
    """
    Create mock investigation folders with reports for testing.

    Returns: (base_logs_dir, list of investigation_ids)
    """
    base_logs_dir = tmp_path / "investigation_logs"
    base_logs_dir.mkdir()

    investigations = [
        {
            "id": "api-test-001",
            "title": "Critical Account Takeover Attack",
            "entity_id": "attacker@evil.com",
            "entity_type": "email",
            "overall_risk_score": 92.5,
            "status": "COMPLETED",
            "owner": "analyst@olorin.com"
        },
        {
            "id": "api-test-002",
            "title": "High Risk Device Fingerprint Spoofing",
            "entity_id": "device-456",
            "entity_type": "device",
            "overall_risk_score": 68.3,
            "status": "COMPLETED",
            "owner": "analyst@olorin.com"
        },
        {
            "id": "api-test-003",
            "title": "Medium Risk Location Anomaly",
            "entity_id": "192.168.100.50",
            "entity_type": "ip",
            "overall_risk_score": 45.2,
            "status": "COMPLETED",
            "owner": "admin@olorin.com"
        },
        {
            "id": "api-test-004",
            "title": "Low Risk Routine Activity",
            "entity_id": "user@example.com",
            "entity_type": "email",
            "overall_risk_score": 15.8,
            "status": "COMPLETED",
            "owner": "admin@olorin.com"
        }
    ]

    for inv in investigations:
        inv_folder = base_logs_dir / inv["id"]
        inv_folder.mkdir()

        # Create report HTML file
        report_file = inv_folder / "comprehensive_investigation_report.html"
        report_file.write_text(f"<html><body><h1>{inv['title']}</h1></body></html>")

        # Create state file with metadata
        state_data = {
            "investigation_id": inv["id"],
            "status": inv["status"],
            "owner": inv["owner"],
            "settings_json": {
                "title": inv["title"],
                "entity_id": inv["entity_id"],
                "entity_type": inv["entity_type"]
            },
            "results_json": {
                "overall_risk_score": inv["overall_risk_score"]
            }
        }
        state_file = inv_folder / "investigation_state_initial.json"
        state_file.write_text(json.dumps(state_data))

    return str(base_logs_dir), [inv["id"] for inv in investigations]


class TestInvestigationReportsListAPI:
    """Integration tests for investigation reports list endpoint."""

    def test_list_all_reports_no_filters(self, client, mock_investigation_reports, monkeypatch):
        """Test listing all reports without filters."""
        base_logs_dir, investigation_ids = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/")

        assert response.status_code == 200
        data = response.json()

        assert "reports" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data

        assert data["total"] == 4
        assert len(data["reports"]) == 4
        assert data["page"] == 1
        assert data["limit"] == 20

    def test_list_reports_with_pagination(self, client, mock_investigation_reports, monkeypatch):
        """Test pagination with page and limit parameters."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/?page=1&limit=2")

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == 4
        assert len(data["reports"]) == 2
        assert data["page"] == 1
        assert data["limit"] == 2

    def test_list_reports_filter_by_investigation_id(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test filtering by specific investigation ID."""
        base_logs_dir, investigation_ids = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        target_id = investigation_ids[0]
        response = client.get(f"/api/v1/reports/investigation/?investigation_id={target_id}")

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == 1
        assert len(data["reports"]) == 1
        assert data["reports"][0]["investigation_id"] == target_id

    def test_list_reports_filter_by_risk_level_critical(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test filtering by critical risk level (80-100)."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/?risk_level=critical")

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == 1
        assert all(
            report["overall_risk_score"] >= 80
            for report in data["reports"]
            if report["overall_risk_score"] is not None
        )

    def test_list_reports_filter_by_risk_level_high(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test filtering by high risk level (60-79)."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/?risk_level=high")

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == 1
        for report in data["reports"]:
            if report["overall_risk_score"] is not None:
                assert 60 <= report["overall_risk_score"] < 80

    def test_list_reports_filter_by_risk_level_medium(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test filtering by medium risk level (40-59)."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/?risk_level=medium")

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == 1
        for report in data["reports"]:
            if report["overall_risk_score"] is not None:
                assert 40 <= report["overall_risk_score"] < 60

    def test_list_reports_filter_by_risk_level_low(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test filtering by low risk level (0-39)."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/?risk_level=low")

        assert response.status_code == 200
        data = response.json()

        assert data["total"] == 1
        for report in data["reports"]:
            if report["overall_risk_score"] is not None:
                assert 0 <= report["overall_risk_score"] < 40

    def test_list_reports_search_by_title(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test search functionality by title."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/?search=Account")

        assert response.status_code == 200
        data = response.json()

        assert data["total"] >= 1
        assert any("Account" in (report["title"] or "") for report in data["reports"])

    def test_list_reports_search_by_entity_id(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test search functionality by entity ID."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/?search=evil.com")

        assert response.status_code == 200
        data = response.json()

        assert data["total"] >= 1
        assert any("evil.com" in (report["entity_id"] or "") for report in data["reports"])

    def test_list_reports_combined_filters(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test combining multiple filters."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get(
            "/api/v1/reports/investigation/?risk_level=critical&search=Attack"
        )

        assert response.status_code == 200
        data = response.json()

        assert data["total"] >= 1
        for report in data["reports"]:
            # Should match both critical risk AND contain "Attack"
            if report["overall_risk_score"] is not None:
                assert report["overall_risk_score"] >= 80

    def test_list_reports_sorted_by_generated_at_desc(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test that reports are sorted by generated_at in descending order."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/")

        assert response.status_code == 200
        data = response.json()

        # Verify descending order
        timestamps = [report["generated_at"] for report in data["reports"]]
        assert timestamps == sorted(timestamps, reverse=True)

    def test_list_reports_empty_directory(self, client, tmp_path, monkeypatch):
        """Test handling when investigation logs directory is empty."""
        empty_dir = tmp_path / "empty_logs"
        empty_dir.mkdir()
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", str(empty_dir))

        response = client.get("/api/v1/reports/investigation/")

        assert response.status_code == 200
        data = response.json()

        assert data["reports"] == []
        assert data["total"] == 0

    def test_list_reports_directory_not_found(self, client, monkeypatch):
        """Test handling when investigation logs directory doesn't exist."""
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", "/nonexistent/path")

        response = client.get("/api/v1/reports/investigation/")

        assert response.status_code == 200
        data = response.json()

        assert data["reports"] == []
        assert data["total"] == 0

    def test_list_reports_invalid_risk_level(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test handling of invalid risk level parameter."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        # Invalid risk level should be ignored or return empty
        response = client.get("/api/v1/reports/investigation/?risk_level=invalid")

        assert response.status_code == 200
        data = response.json()
        # Should return no results for invalid risk level
        assert data["total"] == 0

    def test_list_reports_response_structure(
        self, client, mock_investigation_reports, monkeypatch
    ):
        """Test that response structure matches schema."""
        base_logs_dir, _ = mock_investigation_reports
        monkeypatch.setenv("INVESTIGATION_LOGS_DIR", base_logs_dir)

        response = client.get("/api/v1/reports/investigation/")

        assert response.status_code == 200
        data = response.json()

        # Verify top-level structure
        assert isinstance(data["reports"], list)
        assert isinstance(data["total"], int)
        assert isinstance(data["page"], int)
        assert isinstance(data["limit"], int)

        # Verify report structure
        if data["reports"]:
            report = data["reports"][0]
            assert "investigation_id" in report
            assert "title" in report
            assert "generated_at" in report
            assert "file_size_bytes" in report
            assert "overall_risk_score" in report
            assert "entity_id" in report
            assert "entity_type" in report
            assert "status" in report
            assert "owner" in report
