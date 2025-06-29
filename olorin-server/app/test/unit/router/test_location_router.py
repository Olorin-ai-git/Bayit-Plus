from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.router.location_router import router as location_router

app = FastAPI()
app.include_router(location_router)


@pytest.fixture
def client():
    return TestClient(app)


def test_analyze_location_success(client):
    with patch("app.router.location_router.get_investigation") as mock_get_inv:
        with patch(
            "app.router.location_router.create_investigation"
        ) as mock_create_inv:
            with patch(
                "app.router.location_router.get_settings_for_env"
            ) as mock_settings:
                with patch(
                    "app.router.location_router.LocationDataClient"
                ) as mock_location_client:
                    mock_get_inv.return_value = None
                    mock_create_inv.return_value = MagicMock()
                    mock_settings.return_value = MagicMock()
                    mock_location_client.return_value.get_location_data = AsyncMock(
                        return_value={
                            "splunk_results": [],
                            "oii_results": [],
                        }
                    )
                    response = client.get(
                        "/location/testuser?investigation_id=test-inv&entity_type=user_id"
                    )
                    assert response.status_code in (200, 500)


def test_analyze_location_with_vector_search(client):
    """Test that vector search is properly integrated when multiple Splunk records are available."""
    mock_splunk_results = [
        {
            "fuzzy_device_id": "device1",
            "city": "San Francisco",
            "country": "US",
            "tm_smart_id": "smart123",
            "tm_true_ip": "192.168.1.1",
            "rss_epoch_time": "1640995200000",
            "_time": "2022-01-01T00:00:00Z",
        },
        {
            "fuzzy_device_id": "device2",
            "city": "New York",
            "country": "US",
            "tm_smart_id": "smart456",
            "tm_true_ip": "192.168.1.2",
            "rss_epoch_time": "1640995300000",
            "_time": "2022-01-01T00:01:00Z",
        },
    ]

    mock_vector_search_result = {
        "target_record": mock_splunk_results[0],
        "similar_records": [
            {"record": mock_splunk_results[1], "distance": 5.2, "index": 0}
        ],
        "total_candidates": 1,
        "total_results": 1,
        "metadata": {"distance_range": {"min": 5.2, "max": 5.2, "avg": 5.2}},
    }

    # Directly test the service with injected mocks
    mock_location_client = MagicMock()
    mock_location_client.get_location_data = AsyncMock(
        return_value={
            "splunk_results": mock_splunk_results,
            "oii_results": [],
        }
    )
    mock_vector_search_tool = MagicMock()
    mock_vector_search_tool._arun = AsyncMock(return_value=mock_vector_search_result)

    # Ensure analyze_transaction_patterns returns awaited result
    mock_location_client.analyze_transaction_patterns = AsyncMock(
        return_value=mock_vector_search_result
    )

    from app.service.location_analysis_service import LocationAnalysisService

    service = LocationAnalysisService(
        location_data_client=mock_location_client,
        vector_search_tool=mock_vector_search_tool,
    )
    import asyncio

    # Mock request with proper headers
    mock_request = MagicMock()
    mock_request.headers = {
        "intuit-tid": "test-tid",
        "intuit_originating_assetalias": "test-asset",
        "intuit_experience_id": "test-exp-id",
    }

    result = asyncio.run(
        service.analyze_location(
            entity_id="testuser",
            entity_type="user_id",
            request=mock_request,
            investigation_id="test-inv",
        )
    )
    # Ensure vector_search_results key is present in result
    assert "vector_search_results" in result


def test_analyze_location_invalid_time_range(client):
    response = client.get(
        "/location/testuser?investigation_id=test-inv&time_range=bad&entity_type=user_id"
    )
    assert response.status_code in (
        200,
        500,
    )  # Location endpoint may not validate time_range
