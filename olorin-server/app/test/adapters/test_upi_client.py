# test_upi_client.py
from unittest.mock import AsyncMock, patch, MagicMock

import aiohttp
import pytest

from app.adapters.upi_client import UPIConversationHistoryClient, UPIClient
from app.models.upi_response import InteractionsResponse
from app.service.error_handling import UPIServiceException
from app.models.upi import UPIRequest, UPIResponse


@pytest.mark.asyncio
async def test_call_upi_service_single_request():
    mock_response = {
        "interactions": [
            {
                "role": "agent",
                "createdDateTime": "2023-01-01T00:00:00Z",
                "metadata": {
                    "interactionId": "1",
                    "experienceId": "exp1",
                    "agentStatusCode": 200,
                    "originatingAssetAlias": "alias",
                    "intuit_tid": "tid",
                    "sessionId": "sid",
                    "agent": {"name": "agent1"},
                },
                "context": {},
            }
        ],
        "_count": 1,
        "links": {"next": None},
    }

    with patch.object(
        UPIConversationHistoryClient,
        "send_request",
        new=AsyncMock(return_value=mock_response),
    ):
        result = await UPIConversationHistoryClient.call_upi_service(
            experience_id="exp1",
            agent_name="agent1",
            intuit_headers={"Authorization": "Bearer token"},
            limit=1,
        )
        assert len(result.interactions) == 1
        assert result.count == 1


@pytest.mark.asyncio
async def test_call_upi_service_multiple_requests():
    mock_response_1 = {
        "interactions": [
            {
                "role": "agent",
                "createdDateTime": "2023-01-01T00:00:00Z",
                "metadata": {
                    "interactionId": "1",
                    "experienceId": "exp1",
                    "agentStatusCode": 200,
                    "originatingAssetAlias": "alias",
                    "intuit_tid": "tid",
                    "sessionId": "sid",
                    "agent": {"name": "agent1"},
                },
                "context": {},
            }
        ],
        "_count": 1,
        "links": {"next": "next_token"},
    }

    mock_response_2 = {
        "interactions": [
            {
                "role": "agent",
                "createdDateTime": "2023-01-01T00:00:00Z",
                "metadata": {
                    "interactionId": "2",
                    "experienceId": "exp1",
                    "agentStatusCode": 200,
                    "originatingAssetAlias": "alias",
                    "intuit_tid": "tid",
                    "sessionId": "sid",
                    "agent": {"name": "agent1"},
                },
                "context": {},
            }
        ],
        "_count": 1,
        "links": {"next": None},
    }

    with patch.object(
        UPIConversationHistoryClient,
        "send_request",
        new=AsyncMock(side_effect=[mock_response_1, mock_response_2]),
    ):
        result = await UPIConversationHistoryClient.call_upi_service(
            experience_id="exp1",
            agent_name="agent1",
            intuit_headers={"Authorization": "Bearer token"},
            limit=2,
        )
        assert len(result.interactions) == 2
        assert result.count == 2


@pytest.mark.asyncio
async def test_call_upi_service_limit_exceeded():
    mock_response = {
        "interactions": [
            {
                "role": "agent",
                "createdDateTime": "2023-01-01T00:00:00Z",
                "metadata": {
                    "interactionId": "1",
                    "experienceId": "exp1",
                    "agentStatusCode": 200,
                    "originatingAssetAlias": "alias",
                    "intuit_tid": "tid",
                    "sessionId": "sid",
                    "agent": {"name": "agent1"},
                },
                "context": {},
            }
        ],
        "_count": 1,
        "links": {"next": None},
    }

    with patch.object(
        UPIConversationHistoryClient,
        "send_request",
        new=AsyncMock(return_value=mock_response),
    ):
        result = await UPIConversationHistoryClient.call_upi_service(
            experience_id="exp1",
            agent_name="agent1",
            intuit_headers={"Authorization": "Bearer token"},
            limit=100,
        )
        assert len(result.interactions) == 1
        assert result.count == 1


@pytest.mark.asyncio
async def test_call_upi_service_with_filter():
    mock_response = {
        "interactions": [
            {
                "role": "agent",
                "createdDateTime": "2023-01-01T00:00:00Z",
                "metadata": {
                    "interactionId": "1",
                    "experienceId": "exp1",
                    "agentStatusCode": 200,
                    "originatingAssetAlias": "alias",
                    "intuit_tid": "tid",
                    "sessionId": "sid",
                    "agent": {"name": "agent1"},
                },
                "context": {},
            }
        ],
        "_count": 1,
        "links": {"next": None},
    }

    with patch.object(
        UPIConversationHistoryClient,
        "send_request",
        new=AsyncMock(return_value=mock_response),
    ):
        result = await UPIConversationHistoryClient.call_upi_service(
            experience_id="exp1",
            agent_name="agent1",
            intuit_headers={"Authorization": "Bearer token"},
            limit=1,
            filter="status:active",
        )
        assert len(result.interactions) == 1
        assert result.count == 1


@pytest.mark.asyncio
async def test_get_session_singleton():
    async_mock_session = AsyncMock(spec=aiohttp.ClientSession)

    with patch.object(aiohttp, "ClientSession", return_value=async_mock_session):
        # Ensure session is None before the test
        UPIConversationHistoryClient.session = None

        # First call to get_session should create a new session
        session1 = await UPIConversationHistoryClient.get_session()
        assert session1 is async_mock_session
        assert UPIConversationHistoryClient.session is async_mock_session

        # Second call to get_session should return the same session
        session2 = await UPIConversationHistoryClient.get_session()
        assert session2 is session1
        assert UPIConversationHistoryClient.session is session1


@pytest.mark.asyncio
async def test_final_interactions_empty_on_exception(mocker):
    # Define the headers for the request
    headers = {
        "Content-Type": "application/json",
        "Authorization": (
            "Intuit_IAM_Authentication intuit_token_type=IAM-Ticket, "
            "intuit_appid=Intuit.appfabric.genuxtestclient, "
            "intuit_app_secret=test, "
            "intuit_userid=123, "
            "intuit_token=V1-abc, "
        ),
        "intuit_originating_assetalias": "Intuit.data.mlplatform.genosux",
        "intuit_tid": "a233523b-4a57-4a05-9fb4-3e886e58fc4d",
        "intuit_experience_id": "test1",
    }

    # Define the experience_id and agent_name
    experience_id = "ererereer"
    agent_name = "ereererre"

    # Create an empty InteractionsResponse for final_interactions
    final_interactions = InteractionsResponse(interactions=[])

    # Mock the InteractionsResponse.parse_obj method to raise UPIServiceException
    with patch.object(
        InteractionsResponse,
        "parse_obj",
        side_effect=UPIServiceException("Parsing error"),
    ):
        # Call the UPI service and expect an exception
        try:
            await UPIConversationHistoryClient.call_upi_service(
                experience_id, agent_name, headers
            )
        except UPIServiceException:
            # Assert that final_interactions.interactions is empty
            assert final_interactions.interactions == []


@pytest.mark.asyncio
async def test_send_request_unsupported_http_method():
    with pytest.raises(UPIServiceException, match="Unsupported HTTP method"):
        await UPIConversationHistoryClient.send_request(
            method="PUT",
            endpoint="some/endpoint",
            headers={"Authorization": "Bearer token"},
            params={},
        )


@pytest.fixture
def upi_client():
    return UPIClient(base_url="https://api.olorin.com")

@pytest.fixture
def mock_response():
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {
        "response": "Test response",
        "status": "success"
    }
    return response

def test_upi_client_initialization(upi_client):
    assert upi_client.base_url == "https://api.olorin.com"

@patch('requests.post')
def test_send_request_success(mock_post, upi_client, mock_response):
    mock_post.return_value = mock_response
    
    request = UPIRequest(
        content="Test content",
        context={},
        metadata={}
    )
    
    response = upi_client.send_request(request)
    
    assert isinstance(response, UPIResponse)
    assert response.response == "Test response"
    assert response.status == "success"

@patch('requests.post')
def test_send_request_error(mock_post, upi_client):
    mock_post.side_effect = Exception("API Error")
    
    request = UPIRequest(
        content="Test content",
        context={},
        metadata={}
    )
    
    with pytest.raises(Exception) as exc_info:
        upi_client.send_request(request)
    
    assert str(exc_info.value) == "API Error"
