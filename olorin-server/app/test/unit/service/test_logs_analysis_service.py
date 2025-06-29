import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, Request

from app.service.llm_logs_risk_service import LogsRiskAssessment
from app.service.logs_analysis_service import LogsAnalysisService


@pytest.fixture
def logs_service():
    return LogsAnalysisService()


@pytest.fixture
def mock_request():
    request = MagicMock(spec=Request)
    request.headers = {
        "authorization": "Bearer test_token",
        "intuit_tid": "test_tid",
        "intuit_originating_assetalias": "test_asset",
    }
    return request


@pytest.fixture
def sample_splunk_data():
    return [
        {
            "email_address": "test@example.com",
            "username": "testuser",
            "offering_ids": "qbo,tto",
            "transactions": "5",
            "originating_ips": "192.168.1.1",
            "isp": "Test ISP",
            "cities": "San Francisco",
            "region": "CA",
            "device_ids": "device123",
            "device_first_seen": "2023-01-01",
            "_time": "2023-01-01T00:00:00Z",
        },
        {
            "email_address": "user@domain.com",
            "username": "user2",
            "offering_ids": "qbo",
            "transactions": "2",
            "originating_ips": "10.0.0.1",
            "isp": "Another ISP",
            "cities": "Toronto",
            "region": "ON",
            "device_ids": "device456",
            "device_first_seen": "2023-01-02",
            "_time": "2023-01-01T01:00:00Z",
        },
    ]


@pytest.fixture
def sample_chronos_data():
    return [
        {
            "agentType": "browser",
            "browserString": "Chrome/91.0",
            "fuzzyDeviceFirstSeen": "2023-01-01",
            "kdid": "test_kdid",
            "os": "Windows",
            "osVersion": "10",
            "trueIpCity": "San Francisco",
            "trueIpRegion": "CA",
            "timezone": "PST",
        }
    ]


@pytest.fixture
def mock_llm_assessment():
    return LogsRiskAssessment(
        risk_level=0.65,
        risk_factors=["Multiple locations", "New device"],
        confidence=0.8,
        summary="Medium risk based on logs analysis",
        thoughts="User activity shows some anomalies",
        raw_logs_data_summary="2 log events analyzed",
        chronos_data_summary="1 Chronos entity found",
        timestamp="2023-01-01T00:00:00Z",
    )


class TestLogsAnalysisService:

    @pytest.mark.asyncio
    async def test_analyze_logs_success(
        self,
        logs_service,
        sample_splunk_data,
        sample_chronos_data,
        mock_request,
        mock_llm_assessment,
    ):
        """Test successful logs analysis"""
        with patch(
            "app.service.logs_analysis_service.ensure_investigation_exists"
        ) as mock_ensure:
            with patch.object(
                logs_service, "_fetch_splunk_data", new_callable=AsyncMock
            ) as mock_splunk:
                with patch.object(
                    logs_service, "_fetch_chronos_data", new_callable=AsyncMock
                ) as mock_chronos:
                    with patch.object(
                        logs_service, "_process_llm_assessment", new_callable=AsyncMock
                    ) as mock_llm:
                        with patch(
                            "app.service.logs_analysis_service.demo_mode_users", []
                        ):
                            mock_splunk.return_value = sample_splunk_data
                            mock_chronos.return_value = sample_chronos_data
                            mock_llm.return_value = mock_llm_assessment

                            result = await logs_service.analyze_logs(
                                user_id="test_user",
                                request=mock_request,
                                investigation_id="test_inv",
                                time_range="1d",
                            )

                            # Verify basic structure
                            assert result["userId"] == "test_user"
                            assert result["investigationId"] == "test_inv"
                            assert len(result["parsed_logs"]) == 2
                            assert len(result["chronosEntities"]) == 1
                            assert result["risk_assessment"] is not None

    @pytest.mark.asyncio
    async def test_analyze_logs_demo_mode(self, logs_service, mock_request):
        """Test logs analysis in demo mode returns cached data"""
        cached_response = {"user_id": "demo_user", "from_cache": True}

        with patch("app.service.logs_analysis_service.ensure_investigation_exists"):
            with patch(
                "app.service.logs_analysis_service.demo_mode_users", ["demo_user"]
            ):
                with patch(
                    "app.service.logs_analysis_service.demo_cache",
                    {"demo_user": {"logs": cached_response}},
                ):
                    result = await logs_service.analyze_logs(
                        user_id="demo_user",
                        request=mock_request,
                        investigation_id="test_inv",
                    )

                    assert result == cached_response

    @pytest.mark.asyncio
    async def test_analyze_logs_exception(self, logs_service, mock_request):
        """Test logs analysis handles exceptions"""
        with patch("app.service.logs_analysis_service.ensure_investigation_exists"):
            with patch.object(
                logs_service, "_fetch_splunk_data", new_callable=AsyncMock
            ) as mock_splunk:
                mock_splunk.side_effect = Exception("Splunk connection failed")

                result = await logs_service.analyze_logs(
                    user_id="test_user",
                    request=mock_request,
                    investigation_id="test_inv",
                )

                assert "llm_error_details" in result
                assert (
                    "Splunk connection failed"
                    in result["llm_error_details"]["error_message"]
                )

    @pytest.mark.asyncio
    async def test_fetch_chronos_data_success(self, logs_service, sample_chronos_data):
        """Test successful Chronos data fetch"""
        with patch(
            "app.service.logs_analysis_service.ChronosTool"
        ) as mock_chronos_class:
            mock_chronos = MagicMock()
            mock_chronos._arun = AsyncMock()
            mock_chronos._arun.return_value = json.dumps(
                {"entities": sample_chronos_data}
            )
            mock_chronos_class.return_value = mock_chronos

            result = await logs_service._fetch_chronos_data("test_user", "1d")

            assert result == sample_chronos_data
            mock_chronos._arun.assert_called_once()

    def test_service_initialization(self, logs_service):
        """Test service initialization"""
        assert logs_service.llm_service is not None
        assert hasattr(logs_service.llm_service, "assess_logs_risk")
