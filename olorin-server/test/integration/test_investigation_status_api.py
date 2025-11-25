"""
Integration tests for Hybrid Graph Investigation Status API.
Feature: 006-hybrid-graph-integration - Phase 4 - Task T046

Tests GET /investigations/{id}/status endpoint for real-time investigation progress.
Verifies phase reporting, progress percentage, agent status, tool executions, and logs.
"""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db_session
from app.main import app
from app.models.investigation_state import InvestigationState

TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="module")
def test_db_engine():
    """Create in-memory test database engine"""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_db_session(test_db_engine):
    """Create test database session"""
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_db_engine
    )
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def test_client(test_db_session):
    """Create test client with database session override"""

    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[get_db_session] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def create_sample_investigation_data(investigation_id, status="running", progress=45.0):
    """Helper to create investigation with realistic data"""
    return {
        "investigation_id": investigation_id,
        "user_id": "test-user-123",
        "entity_type": "user",
        "entity_id": "user-456",
        "status": status,
        "current_phase": "domain_analysis",
        "progress_percentage": progress,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "results_json": {
            "agent_status": {
                "device": {
                    "agent_name": "Device Analysis Agent",
                    "status": "completed",
                    "progress_percentage": 100.0,
                    "tools_used": 3,
                    "findings_count": 5,
                },
                "location": {
                    "agent_name": "Location Analysis Agent",
                    "status": "running",
                    "progress_percentage": 60.0,
                    "tools_used": 2,
                    "findings_count": 2,
                },
            },
            "tool_executions": [
                {
                    "tool_id": "tool-001",
                    "tool_name": "Device Fingerprint Analyzer",
                    "status": "completed",
                    "started_at": "2025-10-15T10:00:00Z",
                    "completed_at": "2025-10-15T10:00:05Z",
                    "duration_ms": 5000,
                },
                {
                    "tool_id": "tool-002",
                    "tool_name": "Location Validator",
                    "status": "running",
                    "started_at": "2025-10-15T10:00:05Z",
                },
            ],
            "logs": [
                {
                    "timestamp": "2025-10-15T10:00:00Z",
                    "severity": "info",
                    "source": "investigation_coordinator",
                    "message": "Investigation started",
                },
                {
                    "timestamp": "2025-10-15T10:00:05Z",
                    "severity": "warning",
                    "source": "location_agent",
                    "message": "Location verification slow",
                },
            ],
        },
    }


@pytest.fixture
def sample_investigation(test_db_session):
    """Create sample running investigation"""
    data = create_sample_investigation_data("hg-test-001")
    investigation = InvestigationState(**data)
    test_db_session.add(investigation)
    test_db_session.commit()
    test_db_session.refresh(investigation)
    return investigation


class TestInvestigationStatusAPI:
    """Test GET /investigations/{id}/status endpoint"""

    def test_status_success_running_investigation(
        self, test_client, sample_investigation
    ):
        """Verify status retrieval for running investigation"""
        response = test_client.get(
            f"/api/hybrid-graph/investigations/{sample_investigation.investigation_id}/status",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["investigation_id"] == sample_investigation.investigation_id
        assert data["status"] == "running"
        assert data["current_phase"] == "domain_analysis"
        assert data["progress_percentage"] == 45.0
        assert "agent_status" in data
        assert "device" in data["agent_status"]
        assert data["agent_status"]["device"]["status"] == "completed"
        assert "tool_executions" in data
        assert len(data["tool_executions"]) == 2
        assert "logs" in data

    def test_status_completed_investigation(self, test_client, test_db_session):
        """Verify status retrieval for completed investigation with risk score"""
        data = create_sample_investigation_data(
            "hg-test-002", status="completed", progress=100.0
        )
        data["results_json"]["risk_score"] = 75.5
        investigation = InvestigationState(**data)
        test_db_session.add(investigation)
        test_db_session.commit()

        response = test_client.get(
            f"/api/hybrid-graph/investigations/{investigation.investigation_id}/status",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["progress_percentage"] == 100.0
        assert data["risk_score"] == 75.5

    def test_status_investigation_not_found(self, test_client):
        """Verify 404 for non-existent investigation"""
        response = test_client.get(
            "/api/hybrid-graph/investigations/hg-nonexistent/status",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_status_phase_progression(self, test_client, test_db_session):
        """Verify status correctly reflects all 5 investigation phases"""
        phases = [
            ("initialization", 10.0),
            ("domain_analysis", 30.0),
            ("risk_assessment", 60.0),
            ("evidence_gathering", 80.0),
            ("summary", 95.0),
        ]

        for i, (phase, progress) in enumerate(phases):
            data = create_sample_investigation_data(f"hg-phase-{i}", progress=progress)
            data["current_phase"] = phase
            investigation = InvestigationState(**data)
            test_db_session.add(investigation)
        test_db_session.commit()

        for i, (phase, progress) in enumerate(phases):
            response = test_client.get(
                f"/api/hybrid-graph/investigations/hg-phase-{i}/status",
                headers={"Authorization": "Bearer test-token"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["current_phase"] == phase
            assert data["progress_percentage"] == progress
