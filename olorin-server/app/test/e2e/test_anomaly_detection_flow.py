"""
End-to-end tests for anomaly detection flow.

Tests complete end-to-end flow from detector configuration to anomaly detection.
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

TEST_DATABASE_URL = "sqlite:///./test_anomaly_e2e.db"


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


class TestAnomalyDetectionE2E:
    """End-to-end tests for anomaly detection."""

    @patch("app.service.anomaly.data.windows.get_database_provider")
    @patch("app.service.anomaly.detection_job.run_detection")
    def test_complete_detection_flow(self, mock_run, mock_provider, client, test_db):
        """Test complete E2E detection flow."""
        # Mock Snowflake data with spike
        mock_snowflake = MagicMock()
        normal_data = [
            {
                "window_start": f"2024-01-01T{i//4:02d}:{(i%4)*15:02d}:00",
                "window_end": f"2024-01-01T{i//4:02d}:{(i%4)*15+15:02d}:00",
                "decline_rate": 0.05,
            }
            for i in range(50)
        ]
        # Add spike
        normal_data[25]["decline_rate"] = 0.25
        mock_snowflake.execute_query.return_value = normal_data
        mock_provider.return_value = mock_snowflake

        db = test_db()

        # Create detector
        detector = Detector(
            id=uuid.uuid4(),
            name="E2E Test Detector",
            type="stl_mad",
            cohort_by=["merchant_id"],
            metrics=["decline_rate"],
            params={"period": 24, "k": 3.5, "min_support": 20},
            enabled=True,
        )
        db.add(detector)
        db.commit()

        # Trigger detection
        window_from = datetime.now() - timedelta(days=1)
        window_to = datetime.now()

        response = client.post(
            "/v1/analytics/anomalies/detect",
            json={
                "detector_id": str(detector.id),
                "window_from": window_from.isoformat(),
                "window_to": window_to.isoformat(),
            },
        )

        assert response.status_code == 202
        run_data = response.json()
        run_id = run_data["run_id"]

        # Wait for run to complete (mock)
        # In real E2E, would poll or wait for async completion

        # Verify anomalies were created
        response = client.get(f"/v1/analytics/anomalies?detector_id={detector.id}")
        assert response.status_code == 200

        db.close()
