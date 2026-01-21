"""
Integration tests for anomaly detection flow.

Tests the complete detection run flow with database and API integration.
"""

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

TEST_DATABASE_URL = "sqlite:///./test_anomaly.db"


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
        name="Test STL+MAD Detector",
        type="stl_mad",
        cohort_by=["merchant_id", "channel"],
        metrics=["decline_rate"],
        params={
            "period": 24,
            "robust": True,
            "k": 3.5,
            "persistence": 2,
            "min_support": 20,
        },
        enabled=True,
    )
    db.add(detector)
    db.commit()
    db.refresh(detector)
    yield detector
    db.delete(detector)
    db.commit()
    db.close()


class TestAnomalyDetectionFlow:
    """Integration tests for anomaly detection flow."""

    @patch("app.service.anomaly.data.windows.get_database_provider")
    def test_detection_run_flow(self, mock_provider, client, sample_detector):
        """Test complete detection run flow."""
        # Mock Snowflake data
        mock_snowflake = MagicMock()
        mock_snowflake.execute_query.return_value = [
            {
                "window_start": "2024-01-01T00:00:00",
                "window_end": "2024-01-01T00:15:00",
                "decline_rate": 0.05,
            }
            for _ in range(50)
        ]
        mock_provider.return_value = mock_snowflake

        # Trigger detection run
        window_from = datetime.now() - timedelta(days=1)
        window_to = datetime.now()

        response = client.post(
            "/v1/analytics/anomalies/detect",
            json={
                "detector_id": str(sample_detector.id),
                "window_from": window_from.isoformat(),
                "window_to": window_to.isoformat(),
            },
        )

        assert response.status_code == 202
        data = response.json()
        assert "run_id" in data
        assert data["status"] in ["queued", "running"]

    def test_get_anomalies_endpoint(self, client, test_db):
        """Test GET /v1/analytics/anomalies endpoint."""
        # Create test anomaly
        db = test_db()
        detector = Detector(
            id=uuid.uuid4(),
            name="Test Detector",
            type="stl_mad",
            cohort_by=["merchant_id"],
            metrics=["decline_rate"],
            params={"k": 3.5},
            enabled=True,
        )
        db.add(detector)

        run = DetectionRun(
            id=uuid.uuid4(),
            detector_id=detector.id,
            status="success",
            window_from=datetime.now() - timedelta(days=1),
            window_to=datetime.now(),
        )
        db.add(run)

        anomaly = AnomalyEvent(
            id=uuid.uuid4(),
            run_id=run.id,
            detector_id=detector.id,
            cohort={"merchant_id": "m_01"},
            window_start=datetime.now() - timedelta(hours=1),
            window_end=datetime.now(),
            metric="decline_rate",
            observed=0.15,
            expected=0.05,
            score=4.5,
            severity="critical",
            persisted_n=2,
            status="new",
        )
        db.add(anomaly)
        db.commit()

        # Query anomalies
        response = client.get("/v1/analytics/anomalies?limit=10")

        assert response.status_code == 200
        data = response.json()
        assert "anomalies" in data
        assert len(data["anomalies"]) >= 1

        db.close()
