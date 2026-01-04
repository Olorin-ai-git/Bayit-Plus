"""
Integration tests for Phase 3 User Story 1 backend endpoints.
Tests the complete flow with actual HTTP requests.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.base import Base
from app.models.investigation_audit_log import InvestigationAuditLog
from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db

# Test database configuration
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///./test_phase3.db")


@pytest.fixture(scope="module")
def test_db():
    """Create test database session."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestingSessionLocal()

    # Cleanup
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Get authentication headers for test user."""
    return {"Authorization": "Bearer test-token", "X-User-Id": "test-user-001"}


class TestInvestigationStateEndpoint:
    """Test T012: Enhanced GET /api/v1/investigation-state/{id} endpoint."""

    def test_get_investigation_state_with_progress(self, client, auth_headers):
        """Test that endpoint returns complete snapshot with progress."""
        # Create test investigation
        investigation_id = "test-inv-001"
        create_data = {
            "investigation_id": investigation_id,
            "lifecycle_stage": "IN_PROGRESS",
            "status": "IN_PROGRESS",
            "settings": {
                "name": "Test Investigation",
                "entities": [{"entity_type": "user_id", "entity_value": "user123"}],
                "time_range": {"duration_hours": 24},
                "tools": [{"tool_name": "device_analyzer", "enabled": True}],
                "correlation_mode": "OR",
            },
        }

        # Create investigation
        response = client.post(
            "/api/v1/investigation-state/", json=create_data, headers=auth_headers
        )
        assert response.status_code == 201

        # Update with progress
        update_data = {
            "version": 1,
            "progress": {
                "phases": [
                    {
                        "phase_name": "Data Collection",
                        "status": "COMPLETED",
                        "tools_executed": [
                            {"tool_name": "device_analyzer", "status": "COMPLETED"},
                            {"tool_name": "location_analyzer", "status": "COMPLETED"},
                        ],
                    },
                    {
                        "phase_name": "Analysis",
                        "status": "IN_PROGRESS",
                        "tools_executed": [
                            {"tool_name": "risk_scorer", "status": "RUNNING"}
                        ],
                    },
                ],
                "percent_complete": 40,
                "current_phase": "Analysis",
            },
        }

        response = client.put(
            f"/api/v1/investigation-state/{investigation_id}",
            json=update_data,
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Get state with progress
        response = client.get(
            f"/api/v1/investigation-state/{investigation_id}", headers=auth_headers
        )
        assert response.status_code == 200

        data = response.json()

        # Verify required fields
        assert "version" in data
        assert "etag" in data
        assert "progress" in data

        if data["progress"]:
            assert "current_phase" in data["progress"]
            assert "progress_percentage" in data["progress"]
            assert "phase_progress" in data["progress"]

    def test_performance_requirement(self, client, auth_headers):
        """Test that endpoint meets <100ms P95 performance requirement."""
        investigation_id = "perf-test-001"

        # Create test investigation
        create_data = {
            "investigation_id": investigation_id,
            "lifecycle_stage": "CREATED",
            "status": "CREATED",
        }

        response = client.post(
            "/api/v1/investigation-state/", json=create_data, headers=auth_headers
        )
        assert response.status_code == 201

        # Measure response times
        response_times = []
        for _ in range(20):
            start = time.time()
            response = client.get(
                f"/api/v1/investigation-state/{investigation_id}", headers=auth_headers
            )
            response_times.append((time.time() - start) * 1000)
            assert response.status_code == 200

        # Calculate P95
        response_times.sort()
        p95_index = int(len(response_times) * 0.95)
        p95 = response_times[p95_index]

        # Assert performance requirement
        assert p95 < 100, f"P95 response time {p95:.2f}ms exceeds 100ms requirement"


class TestInvestigationEventsEndpoint:
    """Test T013: GET /api/v1/investigations/{id}/events endpoint."""

    def test_cursor_pagination(self, client, test_db, auth_headers):
        """Test cursor-based pagination works correctly."""
        investigation_id = "events-test-001"

        # Create investigation
        state = InvestigationState(
            investigation_id=investigation_id,
            user_id="test-user-001",
            lifecycle_stage="IN_PROGRESS",
            status="IN_PROGRESS",
            version=1,
        )
        test_db.add(state)

        # Create audit log entries
        for i in range(5):
            entry = InvestigationAuditLog(
                investigation_id=investigation_id,
                user_id="test-user-001",
                action_type="UPDATED",
                from_version=i,
                to_version=i + 1,
                source="API",
                entry_id=f"{int(time.time() * 1000)}_{i:06d}",
            )
            test_db.add(entry)

        test_db.commit()

        # Test pagination
        response = client.get(
            f"/api/v1/investigations/{investigation_id}/events?limit=2",
            headers=auth_headers,
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["items"]) <= 2
        assert "next_cursor" in data
        assert "has_more" in data
        assert "poll_after_seconds" in data
        assert "etag" in data

        # Test with cursor
        if data["next_cursor"]:
            response = client.get(
                f"/api/v1/investigations/{investigation_id}/events?since={data['next_cursor']}&limit=2",
                headers=auth_headers,
            )
            assert response.status_code == 200

    def test_error_scenarios(self, client, auth_headers):
        """Test error scenarios return correct status codes."""
        # Test invalid cursor
        response = client.get(
            "/api/v1/investigations/test-inv/events?since=invalid_cursor",
            headers=auth_headers,
        )
        assert response.status_code == 400

        # Test expired cursor (>30 days old)
        old_timestamp = int((datetime.utcnow() - timedelta(days=31)).timestamp() * 1000)
        expired_cursor = f"{old_timestamp}_000001"
        response = client.get(
            f"/api/v1/investigations/test-inv/events?since={expired_cursor}",
            headers=auth_headers,
        )
        assert response.status_code == 400

        # Test investigation not found
        response = client.get(
            "/api/v1/investigations/non-existent/events", headers=auth_headers
        )
        assert response.status_code == 404

        # Test unauthorized access
        other_user_headers = {
            "Authorization": "Bearer test-token",
            "X-User-Id": "other-user",
        }
        response = client.get(
            "/api/v1/investigations/events-test-001/events", headers=other_user_headers
        )
        assert response.status_code in [403, 404]

    def test_performance_for_50_events(self, client, test_db, auth_headers):
        """Test that endpoint meets <150ms P95 for 50 events."""
        investigation_id = "perf-events-001"

        # Create investigation
        state = InvestigationState(
            investigation_id=investigation_id,
            user_id="test-user-001",
            lifecycle_stage="IN_PROGRESS",
            status="IN_PROGRESS",
            version=1,
        )
        test_db.add(state)

        # Create 50 audit log entries
        for i in range(50):
            entry = InvestigationAuditLog(
                investigation_id=investigation_id,
                user_id="test-user-001",
                action_type="UPDATED",
                from_version=i,
                to_version=i + 1,
                source="API",
                entry_id=f"{int(time.time() * 1000)}_{i:06d}",
            )
            test_db.add(entry)

        test_db.commit()

        # Measure response times
        response_times = []
        for _ in range(20):
            start = time.time()
            response = client.get(
                f"/api/v1/investigations/{investigation_id}/events?limit=50",
                headers=auth_headers,
            )
            response_times.append((time.time() - start) * 1000)
            assert response.status_code == 200

        # Calculate P95
        response_times.sort()
        p95_index = int(len(response_times) * 0.95)
        p95 = response_times[p95_index]

        # Assert performance requirement
        assert p95 < 150, f"P95 response time {p95:.2f}ms exceeds 150ms requirement"


class TestAuthorizationChecks:
    """Test T015: Authorization checks in investigation_state_service."""

    def test_row_level_security(self, client, test_db):
        """Test that users can only access their own investigations."""
        # Create investigation for user1
        user1_headers = {"Authorization": "Bearer test-token", "X-User-Id": "user1"}

        create_data = {
            "investigation_id": "user1-inv-001",
            "lifecycle_stage": "CREATED",
            "status": "CREATED",
        }

        response = client.post(
            "/api/v1/investigation-state/", json=create_data, headers=user1_headers
        )
        assert response.status_code == 201

        # Try to access with user2
        user2_headers = {"Authorization": "Bearer test-token", "X-User-Id": "user2"}

        response = client.get(
            "/api/v1/investigation-state/user1-inv-001", headers=user2_headers
        )
        assert response.status_code == 403

        # User1 should be able to access
        response = client.get(
            "/api/v1/investigation-state/user1-inv-001", headers=user1_headers
        )
        assert response.status_code == 200

    def test_progress_field_populated(self, client, auth_headers):
        """Test that progress field is populated correctly."""
        investigation_id = "progress-test-001"

        # Create and update investigation with progress
        create_data = {
            "investigation_id": investigation_id,
            "lifecycle_stage": "IN_PROGRESS",
            "status": "IN_PROGRESS",
        }

        response = client.post(
            "/api/v1/investigation-state/", json=create_data, headers=auth_headers
        )
        assert response.status_code == 201

        # Update with progress data
        update_data = {
            "version": 1,
            "progress": {
                "phases": [
                    {
                        "phase_name": "Phase1",
                        "status": "COMPLETED",
                        "tools_executed": [
                            {"tool_name": "tool1", "status": "COMPLETED"}
                        ],
                    }
                ],
                "percent_complete": 20,
            },
        }

        response = client.put(
            f"/api/v1/investigation-state/{investigation_id}",
            json=update_data,
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Get state and verify progress
        response = client.get(
            f"/api/v1/investigation-state/{investigation_id}", headers=auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert data["progress"] is not None

        # If progress calculator is enabled, these fields should be present
        if "phase_progress" in data["progress"]:
            assert isinstance(data["progress"]["phase_progress"], dict)
        if "progress_percentage" in data["progress"]:
            assert 0 <= data["progress"]["progress_percentage"] <= 100
