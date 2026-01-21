"""
Comprehensive API endpoint integration tests for anomaly detection.

Tests all endpoints with success and error paths.
"""

import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.anomaly import AnomalyEvent, DetectionRun, Detector
from app.persistence.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test_anomaly_api.db"


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

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client(test_db):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_detector(test_db):
    """Create a sample detector for testing."""
    db = test_db()
    detector = Detector(
        id=uuid.uuid4(),
        name="Test Detector",
        type="stl_mad",
        cohort_by=["merchant_id"],
        metrics=["tx_count"],
        params={"k": 3.5, "persistence": 2, "min_support": 50},
        enabled=True,
    )
    db.add(detector)
    db.commit()
    db.refresh(detector)
    yield detector
    db.delete(detector)
    db.commit()
    db.close()


class TestDetectAnomaliesEndpoint:
    """Tests for POST /v1/analytics/anomalies/detect."""

    @patch("app.service.anomaly.cohort_fetcher.get_database_provider")
    def test_detect_anomalies_success(self, mock_provider, client, sample_detector):
        """Test successful anomaly detection."""
        mock_snowflake = MagicMock()
        mock_snowflake.execute_query.return_value = [
            {
                "window_start": "2024-01-01T00:00:00",
                "window_end": "2024-01-01T00:15:00",
                "tx_count": 100.0,
            }
            for _ in range(100)
        ]
        mock_provider.return_value = mock_snowflake

        response = client.post(
            "/v1/analytics/anomalies/detect",
            json={
                "detector_id": str(sample_detector.id),
                "window_from": (datetime.now() - timedelta(days=1)).isoformat(),
                "window_to": datetime.now().isoformat(),
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "run_id" in data
        assert "status" in data

    def test_detect_anomalies_invalid_detector_id(self, client):
        """Test detection with invalid detector ID."""
        response = client.post(
            "/v1/analytics/anomalies/detect",
            json={
                "detector_id": str(uuid.uuid4()),
                "window_from": (datetime.now() - timedelta(days=1)).isoformat(),
                "window_to": datetime.now().isoformat(),
            },
        )

        assert response.status_code == 404

    def test_detect_anomalies_invalid_window(self, client, sample_detector):
        """Test detection with invalid time window."""
        response = client.post(
            "/v1/analytics/anomalies/detect",
            json={
                "detector_id": str(sample_detector.id),
                "window_from": datetime.now().isoformat(),
                "window_to": (
                    datetime.now() - timedelta(days=1)
                ).isoformat(),  # Invalid
            },
        )

        assert response.status_code in [400, 422]

    def test_detect_anomalies_missing_fields(self, client):
        """Test detection with missing required fields."""
        response = client.post(
            "/v1/analytics/anomalies/detect",
            json={
                "detector_id": str(uuid.uuid4())
                # Missing window_from and window_to
            },
        )

        assert response.status_code == 422

    @patch("app.service.anomaly.cohort_fetcher.get_database_provider")
    def test_detect_anomalies_connection_error(
        self, mock_provider, client, sample_detector
    ):
        """Test detection handles Snowflake connection error."""
        mock_provider.side_effect = ConnectionError("Connection failed")

        response = client.post(
            "/v1/analytics/anomalies/detect",
            json={
                "detector_id": str(sample_detector.id),
                "window_from": (datetime.now() - timedelta(days=1)).isoformat(),
                "window_to": datetime.now().isoformat(),
            },
        )

        assert response.status_code in [500, 503]


class TestListAnomaliesEndpoint:
    """Tests for GET /v1/analytics/anomalies."""

    @pytest.fixture
    def sample_anomaly(self, test_db, sample_detector):
        """Create a sample anomaly event."""
        db = test_db()
        run = DetectionRun(
            id=uuid.uuid4(),
            detector_id=sample_detector.id,
            status="success",
            window_from=datetime.now() - timedelta(days=1),
            window_to=datetime.now(),
            started_at=datetime.now() - timedelta(hours=1),
            finished_at=datetime.now(),
        )
        db.add(run)
        db.commit()

        anomaly = AnomalyEvent(
            id=uuid.uuid4(),
            run_id=run.id,
            detector_id=sample_detector.id,
            cohort={"merchant_id": "m1"},
            window_start=datetime.now() - timedelta(hours=1),
            window_end=datetime.now(),
            metric="tx_count",
            observed=150.0,
            expected=100.0,
            score=5.0,
            severity="critical",
            persisted_n=3,
            status="new",
        )
        db.add(anomaly)
        db.commit()
        db.refresh(anomaly)
        yield anomaly
        db.delete(anomaly)
        db.delete(run)
        db.commit()
        db.close()

    def test_list_anomalies_success(self, client, sample_anomaly):
        """Test successful anomaly listing."""
        response = client.get("/v1/analytics/anomalies")

        assert response.status_code == 200
        data = response.json()
        assert "anomalies" in data
        assert "total" in data
        assert len(data["anomalies"]) >= 1

    def test_list_anomalies_with_filters(self, client, sample_anomaly):
        """Test anomaly listing with filters."""
        response = client.get(
            "/v1/analytics/anomalies",
            params={"severity": "critical", "metric": "tx_count", "limit": 10},
        )

        assert response.status_code == 200
        data = response.json()
        assert all(a["severity"] == "critical" for a in data["anomalies"])

    def test_list_anomalies_invalid_filter(self, client):
        """Test anomaly listing with invalid filter values."""
        response = client.get("/v1/analytics/anomalies", params={"severity": "invalid"})

        # Should either return empty results or 400/422
        assert response.status_code in [200, 400, 422]


class TestGetAnomalyEndpoint:
    """Tests for GET /v1/analytics/anomalies/{id}."""

    @pytest.fixture
    def sample_anomaly(self, test_db, sample_detector):
        """Create a sample anomaly event."""
        db = test_db()
        run = DetectionRun(
            id=uuid.uuid4(),
            detector_id=sample_detector.id,
            status="success",
            window_from=datetime.now() - timedelta(days=1),
            window_to=datetime.now(),
            started_at=datetime.now() - timedelta(hours=1),
            finished_at=datetime.now(),
        )
        db.add(run)
        db.commit()

        anomaly = AnomalyEvent(
            id=uuid.uuid4(),
            run_id=run.id,
            detector_id=sample_detector.id,
            cohort={"merchant_id": "m1"},
            window_start=datetime.now() - timedelta(hours=1),
            window_end=datetime.now(),
            metric="tx_count",
            observed=150.0,
            expected=100.0,
            score=5.0,
            severity="critical",
            persisted_n=3,
            status="new",
        )
        db.add(anomaly)
        db.commit()
        db.refresh(anomaly)
        yield anomaly
        db.delete(anomaly)
        db.delete(run)
        db.commit()
        db.close()

    def test_get_anomaly_success(self, client, sample_anomaly):
        """Test successful anomaly retrieval."""
        response = client.get(f"/v1/analytics/anomalies/{sample_anomaly.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_anomaly.id)
        assert data["metric"] == "tx_count"
        assert data["severity"] == "critical"

    def test_get_anomaly_not_found(self, client):
        """Test retrieval of non-existent anomaly."""
        response = client.get(f"/v1/analytics/anomalies/{uuid.uuid4()}")

        assert response.status_code == 404

    def test_get_anomaly_invalid_id(self, client):
        """Test retrieval with invalid ID format."""
        response = client.get("/v1/analytics/anomalies/invalid-id")

        assert response.status_code == 422


class TestDetectorEndpoints:
    """Tests for detector CRUD endpoints."""

    def test_list_detectors_success(self, client, sample_detector):
        """Test successful detector listing."""
        response = client.get("/v1/analytics/detectors")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_detector_success(self, client, sample_detector):
        """Test successful detector retrieval."""
        response = client.get(f"/v1/analytics/detectors/{sample_detector.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_detector.id)
        assert data["name"] == "Test Detector"

    def test_get_detector_not_found(self, client):
        """Test retrieval of non-existent detector."""
        response = client.get(f"/v1/analytics/detectors/{uuid.uuid4()}")

        assert response.status_code == 404

    def test_create_detector_success(self, client):
        """Test successful detector creation."""
        response = client.post(
            "/v1/analytics/detectors",
            json={
                "name": "New Detector",
                "type": "stl_mad",
                "cohort_by": ["merchant_id"],
                "metrics": ["tx_count"],
                "params": {"k": 3.5, "persistence": 2, "min_support": 50},
                "enabled": True,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Detector"
        assert "id" in data

    def test_create_detector_invalid_type(self, client):
        """Test detector creation with invalid type."""
        response = client.post(
            "/v1/analytics/detectors",
            json={
                "name": "Invalid Detector",
                "type": "invalid_type",
                "cohort_by": ["merchant_id"],
                "metrics": ["tx_count"],
                "params": {},
            },
        )

        assert response.status_code in [400, 422]

    def test_create_detector_missing_fields(self, client):
        """Test detector creation with missing required fields."""
        response = client.post(
            "/v1/analytics/detectors",
            json={
                "name": "Incomplete Detector"
                # Missing required fields
            },
        )

        assert response.status_code == 422

    def test_update_detector_success(self, client, sample_detector):
        """Test successful detector update."""
        response = client.put(
            f"/v1/analytics/detectors/{sample_detector.id}",
            json={
                "name": "Updated Detector",
                "type": "stl_mad",
                "cohort_by": ["merchant_id"],
                "metrics": ["tx_count"],
                "params": {"k": 4.0, "persistence": 3, "min_support": 50},
                "enabled": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Detector"

    def test_delete_detector_success(self, client):
        """Test successful detector deletion."""
        # Create a detector to delete
        db = next(get_db())
        detector = Detector(
            id=uuid.uuid4(),
            name="To Delete",
            type="stl_mad",
            cohort_by=["merchant_id"],
            metrics=["tx_count"],
            params={},
            enabled=True,
        )
        db.add(detector)
        db.commit()
        detector_id = detector.id
        db.close()

        response = client.delete(f"/v1/analytics/detectors/{detector_id}")

        assert response.status_code == 204


class TestReplayEndpoint:
    """Tests for POST /v1/analytics/replay."""

    @patch("app.service.anomaly.cohort_fetcher.get_database_provider")
    def test_replay_success(self, mock_provider, client, sample_detector):
        """Test successful replay."""
        mock_snowflake = MagicMock()
        mock_snowflake.execute_query.return_value = [
            {
                "window_start": "2024-01-01T00:00:00",
                "window_end": "2024-01-01T00:15:00",
                "tx_count": 100.0,
            }
            for _ in range(100)
        ]
        mock_provider.return_value = mock_snowflake

        response = client.post(
            "/v1/analytics/replay",
            json={
                "detector_id": str(sample_detector.id),
                "window_from": (datetime.now() - timedelta(days=7)).isoformat(),
                "window_to": datetime.now().isoformat(),
                "params": {"k": 4.0, "persistence": 3},
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "comparison" in data

    def test_replay_invalid_detector(self, client):
        """Test replay with invalid detector ID."""
        response = client.post(
            "/v1/analytics/replay",
            json={
                "detector_id": str(uuid.uuid4()),
                "window_from": (datetime.now() - timedelta(days=7)).isoformat(),
                "window_to": datetime.now().isoformat(),
                "params": {},
            },
        )

        assert response.status_code == 404
