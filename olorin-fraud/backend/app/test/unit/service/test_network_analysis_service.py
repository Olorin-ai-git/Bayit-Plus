import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, Request

from app.models.network_risk import NetworkRiskLLMAssessment
from app.service.network_analysis_service import NetworkAnalysisService


@pytest.fixture
def network_service():
    return NetworkAnalysisService()


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
def sample_splunk_data():
    return [
        {
            "olorin_userid": "test_user",
            "true_ip": "192.168.1.1",
            "true_ip_country": "US",
            "true_ip_city": "San Francisco",
            "true_ip_region": "CA",
            "user_agent": "Mozilla/5.0",
            "http_method": "POST",
            "http_uri": "/api/v1/data",
            "_time": "2023-01-01T00:00:00Z",
        },
        {
            "olorin_userid": "test_user",
            "true_ip": "10.0.0.1",
            "true_ip_country": "CA",
            "true_ip_city": "Toronto",
            "true_ip_region": "ON",
            "user_agent": "Chrome/91.0",
            "http_method": "GET",
            "http_uri": "/dashboard",
            "_time": "2023-01-01T01:00:00Z",
        },
    ]


@pytest.fixture
def mock_llm_assessment():
    return NetworkRiskLLMAssessment(
        risk_level=0.7,
        risk_factors=["Multiple countries", "Suspicious IP"],
        anomaly_details=["User accessed from two different countries"],
        confidence=0.8,
        summary="Medium risk network activity",
        thoughts="User accessed from multiple countries in short time",
    )


class TestNetworkAnalysisService:

    @pytest.mark.asyncio
    async def test_analyze_network_with_raw_override(
        self, network_service, sample_splunk_data, mock_request, mock_llm_assessment
    ):
        """Test analyze_network with raw_splunk_override data"""
        with patch.object(
            network_service.llm_service, "assess_network_risk", new_callable=AsyncMock
        ) as mock_llm:
            with patch(
                "app.persistence.update_investigation_llm_thoughts"
            ) as mock_update:
                with patch("app.service.network_analysis_service.demo_mode_users", []):
                    mock_llm.return_value = mock_llm_assessment

                    result = await network_service.analyze_network(
                        entity_id="test_user",
                        request=mock_request,
                        investigation_id="test_inv",
                        time_range="1d",
                        raw_splunk_override=sample_splunk_data,
                    )

                    # Verify basic structure
                    assert result["userId"] == "test_user"
                    assert len(result["extracted_network_signals"]) == 2
                    assert "splunk_warning" not in result
                    assert result["network_risk_assessment"] is not None

    @pytest.mark.asyncio
    async def test_analyze_network_demo_mode(self, network_service, mock_request):
        """Test analyze_network in demo mode returns cached data"""
        cached_response = {"user_id": "demo_user", "from_cache": True}

        with patch(
            "app.service.network_analysis_service.demo_mode_users", ["demo_user"]
        ):
            with patch(
                "app.service.network_analysis_service.demo_cache",
                {"demo_user": {"network": cached_response}},
            ):
                result = await network_service.analyze_network(
                    entity_id="demo_user",
                    request=mock_request,
                    investigation_id="test_inv",
                )

                assert result == cached_response

    @pytest.mark.asyncio
    async def test_analyze_network_with_splunk_fetch(
        self, network_service, sample_splunk_data, mock_request, mock_llm_assessment
    ):
        """Test analyze_network that fetches data from Splunk"""
        with patch.object(
            network_service, "_fetch_splunk_data", new_callable=AsyncMock
        ) as mock_fetch:
            with patch.object(
                network_service.llm_service,
                "assess_network_risk",
                new_callable=AsyncMock,
            ) as mock_llm:
                with patch("app.service.network_analysis_service.demo_mode_users", []):
                    mock_fetch.return_value = sample_splunk_data
                    mock_llm.return_value = mock_llm_assessment

                    result = await network_service.analyze_network(
                        entity_id="test_user",
                        request=mock_request,
                        investigation_id="test_inv",
                        time_range="1d",
                    )

                    # Verify Splunk fetch was called
                    mock_fetch.assert_called_once_with(
                        "test_user", "1d", None, None, "user_id"
                    )
                    assert len(result["extracted_network_signals"]) == 2

    @pytest.mark.asyncio
    async def test_analyze_network_exception(self, network_service, mock_request):
        """Test analyze_network handles exceptions gracefully"""
        with patch.object(
            network_service, "_fetch_splunk_data", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.side_effect = Exception("Unexpected error")

            result = await network_service.analyze_network(
                entity_id="test_user", request=mock_request, investigation_id="test_inv"
            )

            assert "error" in result
            assert "Unexpected error" in result["error"]

    def test_service_initialization(self, network_service):
        """Test service initialization"""
        assert network_service.llm_service is not None
        assert hasattr(network_service.llm_service, "assess_network_risk")
