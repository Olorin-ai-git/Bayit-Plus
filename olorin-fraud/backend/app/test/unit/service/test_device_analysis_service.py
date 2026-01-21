import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, Request

from app.service.device_analysis_service import DeviceAnalysisService


@pytest.fixture
def device_service():
    return DeviceAnalysisService()


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
            "fuzzy_device_id": "device123",
            "true_ip_country": "us",
            "true_ip_city": "San Francisco",
            "true_ip_region": "CA",
            "true_ip_latitude": "37.7749",
            "true_ip_longitude": "-122.4194",
            "true_ip": "192.168.1.1",
            "tm_smartid": "smart123",
            "tm_sessionid": "session123",
            "olorin_tid": "tid123",
            "_time": "2023-01-01T00:00:00Z",
        },
        {
            "fuzzy_device_id": "device456",
            "true_ip_country": "ca",
            "true_ip_city": "Toronto",
            "true_ip_region": "ON",
            "true_ip_latitude": "43.6532",
            "true_ip_longitude": "-79.3832",
            "true_ip": "192.168.1.2",
            "tm_smartid": "smart456",
            "tm_sessionid": "session456",
            "olorin_tid": "tid456",
            "_time": "2023-01-01T01:00:00Z",
        },
    ]


@pytest.fixture
def mock_llm_assessment():
    assessment = MagicMock()
    assessment.model_dump.return_value = {
        "risk_level": 0.7,
        "risk_factors": ["Multiple devices", "Geo anomaly"],
        "confidence": 0.85,
        "summary": "Medium risk detected",
        "thoughts": "User has multiple devices from different countries",
    }
    assessment.risk_level = 0.7
    assessment.thoughts = "User has multiple devices from different countries"
    assessment.summary = "Medium risk detected"
    return assessment


class TestDeviceAnalysisService:

    @pytest.mark.asyncio
    async def test_analyze_device_with_raw_override(
        self, device_service, sample_splunk_data, mock_request, mock_llm_assessment
    ):
        """Test analyze_device with raw_splunk_override data"""
        with patch.object(
            device_service.llm_service, "assess_device_risk", new_callable=AsyncMock
        ) as mock_llm:
            with patch(
                "app.persistence.update_investigation_llm_thoughts"
            ) as mock_update:
                with patch("app.persistence.get_investigation") as mock_get_inv:
                    mock_llm.return_value = mock_llm_assessment
                    mock_get_inv.return_value = MagicMock()

                    result = await device_service.analyze_device(
                        entity_id="test_user",
                        entity_type="user_id",
                        investigation_id="test_inv",
                        time_range="1d",
                        raw_splunk_override=sample_splunk_data,
                        request=mock_request,
                    )

                    # Verify the result structure
                    assert result["entity_id"] == "test_user"
                    assert result["num_device_signals"] == 2
                    assert result["splunk_warning"] is None
                    assert result["device_llm_assessment"] is not None

                    # Verify extracted signals have countries added
                    signals = result["retrieved_signals"]
                    assert len(signals) == 2
                    assert signals[0]["countries"] == [
                        "US"
                    ]  # Country normalized to uppercase
                    assert signals[1]["countries"] == ["CA"]

                    # Verify LLM service was called
                    mock_llm.assert_called_once()

                    # Verify investigation was updated
                    mock_update.assert_called_once_with(
                        "test_inv",
                        "device",
                        "User has multiple devices from different countries",
                    )

    @pytest.mark.asyncio
    async def test_analyze_device_without_request(
        self, device_service, sample_splunk_data
    ):
        """Test analyze_device without request (no LLM assessment)"""
        result = await device_service.analyze_device(
            entity_id="test_user",
            entity_type="user_id",
            investigation_id="test_inv",
            time_range="1d",
            raw_splunk_override=sample_splunk_data,
            request=None,
        )

        assert result["entity_id"] == "test_user"
        assert result["num_device_signals"] == 2
        assert result["device_llm_assessment"] is None

    @pytest.mark.asyncio
    async def test_analyze_device_with_splunk_fetch(
        self, device_service, sample_splunk_data, mock_request, mock_llm_assessment
    ):
        """Test analyze_device that fetches data from Splunk"""
        with patch.object(
            device_service, "_fetch_splunk_data", new_callable=AsyncMock
        ) as mock_fetch:
            with patch.object(
                device_service.llm_service, "assess_device_risk", new_callable=AsyncMock
            ) as mock_llm:
                mock_fetch.return_value = sample_splunk_data
                mock_llm.return_value = mock_llm_assessment

                result = await device_service.analyze_device(
                    entity_id="test_user",
                    entity_type="user_id",
                    investigation_id="test_inv",
                    time_range="1d",
                    request=mock_request,
                )

                # Verify Splunk fetch was called
                mock_fetch.assert_called_once_with("test_user", "1d", "user_id")
                assert result["num_device_signals"] == 2

    @pytest.mark.asyncio
    async def test_analyze_device_no_splunk_data(self, device_service, mock_request):
        """Test analyze_device when no Splunk data is found"""
        with patch.object(
            device_service, "_fetch_splunk_data", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = []

            result = await device_service.analyze_device(
                entity_id="test_user",
                entity_type="user_id",
                investigation_id="test_inv",
                time_range="1d",
                request=mock_request,
            )

            assert result["num_device_signals"] == 0
            assert (
                result["splunk_warning"]
                == "No device data found in Splunk for the specified time range."
            )

    @pytest.mark.asyncio
    async def test_analyze_device_llm_error(
        self, device_service, sample_splunk_data, mock_request
    ):
        """Test analyze_device when LLM assessment fails"""
        with patch.object(
            device_service.llm_service, "assess_device_risk", new_callable=AsyncMock
        ) as mock_llm:
            mock_llm.side_effect = Exception("LLM service unavailable")

            with pytest.raises(HTTPException) as exc_info:
                await device_service.analyze_device(
                    entity_id="test_user",
                    entity_type="user_id",
                    investigation_id="test_inv",
                    time_range="1d",
                    raw_splunk_override=sample_splunk_data,
                    request=mock_request,
                )

            assert exc_info.value.status_code == 500
            assert "LLM device risk assessment failed" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_analyze_device_signal_processing(self, device_service):
        """Test device signal processing logic"""
        # Test data with missing device IDs and countries
        test_data = [
            {
                "fuzzy_device_id": None,
                "true_ip_country": "us",
                "true_ip_city": "New York",
                "_time": "2023-01-01T00:00:00Z",
            },
            {
                "fuzzy_device_id": "device123",
                "true_ip_country": None,
                "true_ip_city": "London",
                "_time": "2023-01-01T01:00:00Z",
            },
            {
                "fuzzy_device_id": "device123",
                "true_ip_country": "uk",
                "true_ip_city": "London",
                "_time": "2023-01-01T02:00:00Z",
            },
        ]

        result = await device_service.analyze_device(
            entity_id="test_user",
            entity_type="user_id",
            investigation_id="test_inv",
            raw_splunk_override=test_data,
        )

        signals = result["retrieved_signals"]
        assert len(signals) == 3

        # Check that countries are properly assigned
        # Note: All devices with the same device_id share the same countries list
        assert signals[0]["countries"] == [
            "US"
        ]  # device ID is None, but country exists
        assert signals[1]["countries"] == [
            "UK"
        ]  # device123 gets UK from the third entry
        assert signals[2]["countries"] == ["UK"]  # device123 and country exist

    @pytest.mark.asyncio
    async def test_fetch_splunk_data_success(self, device_service):
        """Test successful Splunk data fetch"""
        mock_result = {"results": [{"device_id": "123", "_time": "2023-01-01"}]}

        with patch(
            "app.service.device_analysis_service.SplunkQueryTool"
        ) as mock_tool_class:
            with patch(
                "app.service.device_analysis_service.build_base_search"
            ) as mock_build:
                with patch(
                    "app.service.device_analysis_service.get_settings_for_env"
                ) as mock_settings:
                    mock_tool = AsyncMock()
                    mock_tool.arun.return_value = mock_result
                    mock_tool_class.return_value = mock_tool

                    mock_build.return_value = (
                        "search index=testindex olorin_userid=test_user"
                    )
                    mock_settings.return_value.splunk_index = "testindex"

                    result = await device_service._fetch_splunk_data(
                        "test_user", "1d", "user_id"
                    )

                    assert result == [{"device_id": "123", "_time": "2023-01-01"}]
                    mock_tool.arun.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_splunk_data_list_result(self, device_service):
        """Test Splunk data fetch when result is a list"""
        mock_result = [{"device_id": "123", "_time": "2023-01-01"}]

        with patch(
            "app.service.device_analysis_service.SplunkQueryTool"
        ) as mock_tool_class:
            with patch(
                "app.service.device_analysis_service.build_base_search"
            ) as mock_build:
                with patch(
                    "app.service.device_analysis_service.get_settings_for_env"
                ) as mock_settings:
                    mock_tool = AsyncMock()
                    mock_tool.arun.return_value = mock_result
                    mock_tool_class.return_value = mock_tool

                    mock_build.return_value = (
                        "search index=testindex olorin_userid=test_user"
                    )
                    mock_settings.return_value.splunk_index = "testindex"

                    result = await device_service._fetch_splunk_data(
                        "test_user", "1d", "user_id"
                    )

                    assert result == mock_result

    @pytest.mark.asyncio
    async def test_fetch_splunk_data_invalid_time_range(self, device_service):
        """Test Splunk data fetch with invalid time range"""
        # Invalid time range should be caught and return empty list instead of raising
        result = await device_service._fetch_splunk_data(
            "test_user", "invalid", "user_id"
        )

        assert result == []

    @pytest.mark.asyncio
    async def test_fetch_splunk_data_exception(self, device_service):
        """Test Splunk data fetch when exception occurs"""
        with patch(
            "app.service.device_analysis_service.SplunkQueryTool"
        ) as mock_tool_class:
            with patch(
                "app.service.device_analysis_service.build_base_search"
            ) as mock_build:
                mock_tool = AsyncMock()
                mock_tool.arun.side_effect = Exception("Splunk connection failed")
                mock_tool_class.return_value = mock_tool

                mock_build.return_value = (
                    "search index=testindex olorin_userid=test_user"
                )

                result = await device_service._fetch_splunk_data(
                    "test_user", "1d", "user_id"
                )

                assert result == []

    @pytest.mark.asyncio
    async def test_fetch_splunk_data_unexpected_format(self, device_service):
        """Test Splunk data fetch with unexpected result format"""
        with patch(
            "app.service.device_analysis_service.SplunkQueryTool"
        ) as mock_tool_class:
            with patch(
                "app.service.device_analysis_service.build_base_search"
            ) as mock_build:
                with patch(
                    "app.service.device_analysis_service.get_settings_for_env"
                ) as mock_settings:
                    mock_tool = AsyncMock()
                    mock_tool.arun.return_value = "unexpected_string_result"
                    mock_tool_class.return_value = mock_tool

                    mock_build.return_value = (
                        "search index=testindex olorin_userid=test_user"
                    )
                    mock_settings.return_value.splunk_index = "testindex"

                    result = await device_service._fetch_splunk_data(
                        "test_user", "1d", "user_id"
                    )

                    assert result == []

    def test_service_initialization(self, device_service):
        """Test service initialization"""
        assert device_service.llm_service is not None
        assert hasattr(device_service.llm_service, "assess_device_risk")
