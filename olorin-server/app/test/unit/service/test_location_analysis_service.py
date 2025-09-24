import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import Request

# OBSOLETE TEST: LocationAnalysisService and ato_agents have been removed
# This test is for legacy functionality that no longer exists
# Location functionality is now handled by location_router.py with basic implementation
pytestmark = pytest.mark.skip(reason="LocationAnalysisService removed - obsolete test file")


@pytest.fixture
def mock_location_client():
    return MagicMock(spec=LocationDataClient)


@pytest.fixture
def mock_vector_search_tool():
    return MagicMock(spec=VectorSearchTool)


@pytest.fixture
def location_service(mock_location_client, mock_vector_search_tool):
    return LocationAnalysisService(mock_location_client, mock_vector_search_tool)


@pytest.fixture
def mock_request():
    request = MagicMock(spec=Request)
    request.headers = {
        "authorization": "Bearer test_token",
        "olorin_tid": "test_tid",
        "olorin_originating_assetalias": "test_asset",
    }
    return request


@pytest.fixture
def sample_location_data():
    return {
        "splunk_results": [
            {
                "fuzzy_device_id": "device123",
                "country": "us",
                "city": "San Francisco",
                "tm_sessionid": "session123",
                "_time": "2023-01-01T00:00:00Z",
            },
            {
                "fuzzy_device_id": "device456",
                "country": "ca",
                "city": "Toronto",
                "tm_sessionid": "session456",
                "_time": "2023-01-01T01:00:00Z",
            },
        ],
        "oii_results": [
            {
                "country": "US",
                "state": "CA",
                "city": "San Francisco",
                "postal_code": "94105",
            }
        ],
    }


@pytest.fixture
def mock_vector_analysis():
    return {
        "analysis_status": "completed",
        "pattern_score": 0.7,
        "anomalies": ["Multiple countries"],
        "timestamp": "2023-01-01T00:00:00Z",
    }


@pytest.fixture
def mock_llm_assessment():
    assessment = MagicMock()
    assessment.to_dict.return_value = {
        "risk_level": 0.6,
        "risk_factors": ["Multiple countries", "New device"],
        "confidence": 0.8,
        "summary": "Medium risk detected",
        "thoughts": "User accessed from multiple countries",
        "timestamp": "2023-01-01T00:00:00Z",
    }
    assessment.risk_level = 0.6
    assessment.thoughts = "User accessed from multiple countries"
    assessment.summary = "Medium risk detected"
    return assessment


class TestLocationAnalysisService:

    @pytest.mark.asyncio
    async def test_analyze_location_success(
        self,
        location_service,
        sample_location_data,
        mock_vector_analysis,
        mock_request,
        mock_llm_assessment,
    ):
        """Test successful location analysis"""
        with patch("app.service.location_analysis_service.demo_mode_users", []):
            with patch.object(
                location_service.location_data_client,
                "get_location_data",
                new_callable=AsyncMock,
            ) as mock_get_data:
                with patch.object(
                    location_service.location_data_client,
                    "analyze_transaction_patterns",
                    new_callable=AsyncMock,
                ) as mock_vector:
                    with patch.object(
                        location_service.llm_service,
                        "assess_location_risk",
                        new_callable=AsyncMock,
                    ) as mock_llm:
                        with patch(
                            "app.persistence.update_investigation_llm_thoughts"
                        ) as mock_update:
                            with patch(
                                "app.persistence.get_investigation"
                            ) as mock_get_inv:
                                mock_get_data.return_value = sample_location_data
                                mock_vector.return_value = mock_vector_analysis
                                mock_llm.return_value = mock_llm_assessment
                                mock_get_inv.return_value = MagicMock()

                                result = await location_service.analyze_location(
                                    entity_id="test_user",
                                    entity_type="user_id",
                                    request=mock_request,
                                    investigation_id="test_inv",
                                    time_range="1d",
                                )

                                # Verify basic structure
                                assert "location_risk_assessment" in result
                                assert "device_locations" in result
                                assert "vector_search_results" in result

    @pytest.mark.asyncio
    async def test_analyze_location_demo_mode(self, location_service, mock_request):
        """Test location analysis in demo mode returns cached data"""
        cached_response = {"user_id": "demo_user", "from_cache": True}

        with patch(
            "app.service.location_analysis_service.demo_mode_users", ["demo_user"]
        ):
            with patch(
                "app.service.location_analysis_service.demo_cache",
                {"demo_user": {"location": cached_response}},
            ):
                result = await location_service.analyze_location(
                    entity_id="demo_user",
                    entity_type="user_id",
                    request=mock_request,
                    investigation_id="test_inv",
                )

                assert result == cached_response

    @pytest.mark.asyncio
    async def test_analyze_location_exception(self, location_service, mock_request):
        """Test location analysis handles top-level exceptions"""
        with patch.object(
            location_service.location_data_client,
            "get_location_data",
            new_callable=AsyncMock,
        ) as mock_get_data:
            mock_get_data.side_effect = Exception("Data client failed")

            result = await location_service.analyze_location(
                entity_id="test_user",
                entity_type="user_id",
                request=mock_request,
                investigation_id="test_inv",
            )

            # Should return error response
            assert "error" in result

    def test_service_initialization(
        self, mock_location_client, mock_vector_search_tool
    ):
        """Test service initialization"""
        service = LocationAnalysisService(mock_location_client, mock_vector_search_tool)

        assert service.location_data_client == mock_location_client
        assert service.vector_search_tool == mock_vector_search_tool
        assert service.llm_service is not None
        assert hasattr(service.llm_service, "assess_location_risk")
