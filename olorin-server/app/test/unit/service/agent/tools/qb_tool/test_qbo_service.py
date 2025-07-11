import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.service.agent.tools.qb_tool.qbo_service import (
    FinancialService,
    _execute_post_request,
    _execute_post_request_sync,
    get_ceres_url,
)
from app.service.error_handling import FinancialApiError


@pytest.fixture
def mock_headers():
    return {"Authorization": "Bearer test_token", "olorin-tid": "test-tid"}


@pytest.fixture
def mock_payload():
    return {"query": "test query"}


@pytest.fixture
def mock_response_data():
    return {
        "data": {
            "contacts": {
                "data": [
                    {
                        "id": "1",
                        "firstName": "John",
                        "lastName": "Doe",
                        "displayName": "John Doe",
                        "companyName": "ACME Inc.",
                    },
                    {
                        "id": "2",
                        "firstName": "Jane",
                        "lastName": "Smith",
                        "displayName": "Jane Smith",
                        "companyName": "XYZ Corp",
                    },
                ]
            }
        }
    }


@pytest.fixture
def error_response_data():
    return {"errors": [{"message": "Something went wrong", "code": "ERROR_CODE"}]}


@patch("app.service.agent.tools.qb_tool.qbo_service.get_settings_for_env")
def test_get_ceres_url(mock_get_settings):
    # Arrange
    mock_settings = MagicMock()
    mock_settings.ceres_endpoint = "https://ceres.example.com"
    mock_get_settings.return_value = mock_settings

    # Act
    url = get_ceres_url()

    # Assert
    assert url == "https://ceres.example.com/graphql"
    mock_get_settings.assert_called_once()


@pytest.mark.asyncio
@patch("app.service.agent.tools.qb_tool.qbo_service.httpx.AsyncClient")
async def test_execute_post_request_success(
    mock_async_client, mock_headers, mock_payload, mock_response_data
):
    # Arrange
    mock_client = AsyncMock()
    mock_async_client.return_value.__aenter__.return_value = mock_client

    mock_response = MagicMock()
    mock_response.content = json.dumps(mock_response_data).encode()
    mock_response.raise_for_status = MagicMock()

    mock_client.post.return_value = mock_response
    url = "https://example.com/api"

    # Act
    result = await _execute_post_request(url, mock_headers, mock_payload)

    # Assert
    mock_client.post.assert_called_once_with(
        url, json=mock_payload, headers=mock_headers
    )
    assert result == mock_response_data


@pytest.mark.asyncio
@patch("app.service.agent.tools.qb_tool.qbo_service.httpx.AsyncClient")
async def test_execute_post_request_error(
    mock_async_client, mock_headers, mock_payload
):
    # Arrange
    mock_client = AsyncMock()
    mock_async_client.return_value.__aenter__.return_value = mock_client

    mock_client.post.side_effect = httpx.HTTPError("HTTP error")
    url = "https://example.com/api"

    # Act & Assert
    with pytest.raises(httpx.HTTPError):
        await _execute_post_request(url, mock_headers, mock_payload)


@patch("app.service.agent.tools.qb_tool.qbo_service.httpx.Client")
def test_execute_post_request_sync_success(
    mock_client, mock_headers, mock_payload, mock_response_data
):
    # Arrange
    mock_client_instance = MagicMock()
    mock_client.return_value.__enter__.return_value = mock_client_instance

    mock_response = MagicMock()
    mock_response.content = json.dumps(mock_response_data).encode()
    mock_response.raise_for_status = MagicMock()

    mock_client_instance.post.return_value = mock_response
    url = "https://example.com/api"

    # Act
    result = _execute_post_request_sync(url, mock_headers, mock_payload)

    # Assert
    mock_client_instance.post.assert_called_once_with(
        url, json=mock_payload, headers=mock_headers
    )
    assert result == mock_response_data


@patch("app.service.agent.tools.qb_tool.qbo_service.httpx.Client")
def test_execute_post_request_sync_error(mock_client, mock_headers, mock_payload):
    # Arrange
    mock_client_instance = MagicMock()
    mock_client.return_value.__enter__.return_value = mock_client_instance

    mock_client_instance.post.side_effect = httpx.HTTPError("HTTP error")
    url = "https://example.com/api"

    # Act & Assert
    with pytest.raises(httpx.HTTPError):
        _execute_post_request_sync(url, mock_headers, mock_payload)


class TestFinancialService:
    @patch("app.service.agent.tools.qb_tool.qbo_service._execute_post_request_sync")
    def test_get_customers_sync_success(
        self, mock_execute_post, mock_headers, mock_response_data
    ):
        # Arrange
        mock_execute_post.return_value = mock_response_data
        service = FinancialService()

        # Act
        result = service.get_customers_sync(mock_headers)

        # Assert
        assert result == mock_response_data
        mock_execute_post.assert_called_once()
        # Verify that we're sending the correct payload
        args = mock_execute_post.call_args
        assert args[1]["headers"] == mock_headers

    @patch("app.service.agent.tools.qb_tool.qbo_service._execute_post_request_sync")
    def test_get_customers_sync_error(self, mock_execute_post, mock_headers):
        # Arrange
        mock_execute_post.side_effect = Exception("API error")
        service = FinancialService()

        # Act
        result = service.get_customers_sync(mock_headers)

        # Assert
        assert result is None
        mock_execute_post.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.qb_tool.qbo_service._execute_post_request")
    async def test_get_customers_success(
        self, mock_execute_post, mock_headers, mock_response_data
    ):
        # Arrange
        mock_execute_post.return_value = mock_response_data
        service = FinancialService()

        # Act
        result = await service.get_customers(mock_headers)

        # Assert
        assert result == mock_response_data
        mock_execute_post.assert_called_once()
        # Verify that we're sending the correct payload
        args = mock_execute_post.call_args
        assert args[1]["headers"] == mock_headers

    @pytest.mark.asyncio
    @patch("app.service.agent.tools.qb_tool.qbo_service._execute_post_request")
    async def test_get_customers_error(self, mock_execute_post, mock_headers):
        # Arrange
        mock_execute_post.side_effect = Exception("API error")
        service = FinancialService()

        # Act
        result = await service.get_customers(mock_headers)

        # Assert
        assert result is None
        mock_execute_post.assert_called_once()

    def test_raise_exception_on_error_with_error(self, error_response_data):
        # Act & Assert
        with pytest.raises(FinancialApiError):
            FinancialService.raise_exception_on_error(
                "Test message", error_response_data
            )

    def test_raise_exception_on_error_without_error(self, mock_response_data):
        # Act - Should not raise exception
        FinancialService.raise_exception_on_error("Test message", mock_response_data)
        # No assertion needed - test passes if no exception is raised
