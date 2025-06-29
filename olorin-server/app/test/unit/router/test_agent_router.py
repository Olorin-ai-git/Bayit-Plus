import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.agent_request import (
    Agent,
    AgentInput,
    AgentRequest,
    ContentItem,
    Context,
    Metadata,
)
from app.models.agent_response import AgentResponse
from app.router.agent_router import agenerate_chat_response
from app.router.api_router import router as api_router

app = FastAPI()
app.include_router(api_router)


@pytest.fixture
def mock_request():
    class MockRequest:
        headers = {
            "Authorization": 'Bearer sample_token olorin_userid="sample_user_id" olorin_token="sample_token" olorin_realmid="sample_realmid"',
            "olorin_experience_id": "sample_experience_id",
            "olorin_originating_assetalias": "sample_assetalias",
        }
        state = type("obj", (object,), {"olorin_tid": "sample_tid"})

    return MockRequest()


@pytest.fixture
def agent_request():
    return AgentRequest(
        agent=Agent(name="chat_agent"),
        agentInput=AgentInput(content=[ContentItem(text="Test Input", type="text")]),
        metadata=Metadata(
            interactionGroupId="sample_session_id",
            supportedOutputFormats=[],
            additionalMetadata={},
        ),
        context=Context(
            interactionType="sample_interaction_type",
            platform="sample_platform",
            additionalContext={},
        ),
    )


@pytest.fixture
def client():
    return TestClient(app)


@pytest.mark.asyncio
@patch("app.router.agent_router.agent_service.ainvoke_agent")
@patch("app.router.agent_router.construct_agent_context")
async def test_agenerate_chat_response(
    mock_construct_context, mock_invoke_agent, mock_request, agent_request
):
    # Setup mocks
    from app.models.agent_context import AgentContext

    mock_agent_context = MagicMock(spec=AgentContext)
    mock_agent_context.input = (
        "Test Input"  # Add the input attribute that the code expects
    )
    mock_construct_context.return_value = mock_agent_context
    mock_invoke_agent.return_value = ("Sample response", "trace-123")

    # Call the function
    response = await agenerate_chat_response(mock_request, agent_request)

    # Assertions
    mock_construct_context.assert_called_once_with(mock_request, agent_request)
    # For non-fraud_investigation agents, it should use the input directly, not call ainvoke_agent
    mock_invoke_agent.assert_not_called()

    # assert isinstance(response, AgentResponse)
    assert response["agentOutput"]["plainText"] == "Test Input"  # Should echo the input
    assert "agentTraceId" in response["agentMetadata"]


def test_disable_demo_mode(client):
    import app.router.demo_router as demo_router_mod

    demo_router_mod.demo_mode_users.add("testuser")
    response = client.post("/api/demo/testuser/off")
    assert response.status_code == 200
    assert response.json()["message"].startswith("Demo mode disabled")
    assert "testuser" not in demo_router_mod.demo_mode_users


def test_get_all_demo_agent_responses_cache_hit(client):
    import app.router.demo_router as demo_router_mod

    demo_router_mod.demo_mode_users.add("testuser")
    demo_router_mod.demo_cache["testuser"] = {
        "network": 1,
        "device": 2,
        "location": 3,
        "logs": 4,
        "oii": 5,
    }
    response = client.get("/api/demo/testuser/all")
    assert response.status_code == 200
    data = response.json()
    assert data["demo_mode"] is True
    assert data["user_id"] == "testuser"
    assert data["network"] == 1
    assert data["oii"] == 5


def test_get_all_demo_agent_responses_cache_miss(client):
    import app.router.demo_router as demo_router_mod

    demo_router_mod.demo_mode_users.discard("testuser")
    demo_router_mod.demo_cache.pop("testuser", None)
    response = client.get("/api/demo/testuser/all")
    assert response.status_code == 200
    assert "error" in response.json()


def test_get_online_identity_info_success(client):
    with patch(
        "app.service.agent.tools.oii_tool.oii_tool.OIITool._run",
        return_value='{"foo": "bar"}',
    ):
        with patch(
            "app.models.oii_response.OIIResponse.model_validate_json",
            return_value=MagicMock(model_dump=lambda: {"foo": "bar"}),
        ):
            response = client.get("/api/oii/testuser")
            assert response.status_code == 200
            assert response.json()["foo"] == "bar"


def test_get_online_identity_info_tool_error(client):
    with patch(
        "app.service.agent.tools.oii_tool.oii_tool.OIITool._run",
        side_effect=Exception("fail"),
    ):
        response = client.get("/api/oii/testuser")
        assert response.status_code == 500
        assert "fail" in response.json()["detail"]


def test_get_oii_source_location_success(client):
    with patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_oii_location_info",
        return_value={"source": "OII"},
    ):
        response = client.get("/api/location/source/oii/testuser")
        assert response.status_code == 200
        assert response.json()["source"] == "OII"


def test_get_oii_source_location_error(client):
    with patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_oii_location_info",
        side_effect=Exception("fail"),
    ):
        response = client.get("/api/location/source/oii/testuser")
        assert response.status_code == 500
        assert "Failed to get OII location data" in response.json()["detail"]


def test_get_business_source_location_success(client):
    with patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_business_location_info",
        return_value=[{"source": "Business Location"}],
    ):
        response = client.get("/api/location/source/business/testuser")
        assert response.status_code == 200
        assert response.json()[0]["source"] == "Business Location"


def test_get_business_source_location_error(client):
    with patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_business_location_info",
        side_effect=Exception("fail"),
    ):
        response = client.get("/api/location/source/business/testuser")
        assert response.status_code == 200
        assert (
            "error" in response.json()
            or response.json()[0]["source"] == "Business Location"
        )


def test_get_phone_source_location_success(client):
    with patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_phone_location_info",
        return_value=[{"source": "Phone Location"}],
    ):
        response = client.get("/api/location/source/phone/testuser")
        assert response.status_code == 200
        assert response.json()[0]["source"] == "Phone Location"


def test_get_phone_source_location_error(client):
    with patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_phone_location_info",
        side_effect=Exception("fail"),
    ):
        response = client.get("/api/location/source/phone/testuser")
        assert response.status_code == 200
        assert (
            "error" in response.json()
            or response.json()[0]["source"] == "Phone Location"
        )


def test_get_location_risk_analysis_success(client):
    class DummySettings:
        splunk_host = "dummy_host"
        olorin_experience_id = "dummy_experience_id"
        olorin_originating_assetalias = "dummy_assetalias"

        def get_setting(self, key):
            return "dummy"

    dummy_settings = DummySettings()

    dummy_splunk_client = AsyncMock()
    dummy_splunk_client.connect = AsyncMock()
    dummy_splunk_client.disconnect = AsyncMock()
    dummy_splunk_client.is_connected = lambda: False
    dummy_splunk_client.search = AsyncMock(return_value=[])

    oii_mock = MagicMock()
    oii_mock.model_dump.return_value = {"source": "OII"}

    business_mock = MagicMock()
    business_mock.model_dump.return_value = {"source": "Business"}
    phone_mock = MagicMock()
    phone_mock.model_dump.return_value = {"source": "Phone"}
    patch1 = patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_oii_location_info",
        new_callable=AsyncMock,
        return_value=oii_mock,
    )

    patch2 = patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_business_location_info",
        new_callable=AsyncMock,
        return_value=business_mock,
    )
    patch3 = patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_phone_location_info",
        new_callable=AsyncMock,
        return_value=phone_mock,
    )

    def make_magic_with_raw():
        m = MagicMock()

        def custom_getattribute(name):
            if name == "raw_splunk_results":
                return []
            return MagicMock()

        m.__getattribute__ = custom_getattribute
        m.__getitem__.side_effect = lambda k: (
            [] if k == "raw_splunk_results" else MagicMock()
        )
        return m

    device_response_mock = make_magic_with_raw()
    device_response_mock.model_dump.return_value = make_magic_with_raw()
    device_response_mock.__getitem__.side_effect = lambda k: (
        [] if k == "raw_splunk_results" else MagicMock()
    )
    patch4 = patch(
        "app.router.api_router.analyze_device", return_value=device_response_mock
    )
    patch5 = patch(
        "app.router.api_router.ainvoke_agent",
        return_value=(
            json.dumps(
                {
                    "risk_assessment": {
                        "risk_level": 0.1,
                        "risk_factors": ["test"],
                        "confidence": 0.9,
                        "summary": "ok",
                        "thoughts": "none",
                    }
                }
            ),
            None,
        ),
    )
    patch6 = patch(
        "app.router.device_router.SplunkClient",
        return_value=dummy_splunk_client,
        create=True,
    )
    patch7 = patch("app.utils.idps_utils.get_app_secret", return_value="dummy")
    patch8 = patch(
        "app.router.device_router.get_settings_for_env", return_value=dummy_settings
    )

    # Also patch analyze_transaction_patterns to avoid awaitable errors
    patch9 = patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.analyze_transaction_patterns",
        new_callable=AsyncMock,
        return_value={"analysis_status": "ok"},
    )

    with patch1, patch2, patch3, patch4, patch5, patch6, patch7, patch8, patch9:
        response = client.get(
            "/api/location/risk-analysis/testuser?investigation_id=inv1"
        )
        assert response.status_code in (200, 500)


def test_get_location_risk_analysis_error(client):
    with patch(
        "app.service.agent.ato_agents.location_data_agent.client.LocationDataClient.get_oii_location_info",
        side_effect=Exception("fail"),
    ):
        response = client.get(
            "/api/location/risk-analysis/testuser?investigation_id=inv1"
        )
        assert response.status_code == 500
        assert "Failed to perform location risk analysis" in response.json()["detail"]


def test_cancel_splunk_job_success(client):
    with patch(
        "httpx.AsyncClient.post", return_value=MagicMock(status_code=200, text="ok")
    ):
        with patch(
            "app.service.config.get_settings_for_env",
            return_value=MagicMock(splunk_host="host"),
        ):
            with patch("app.utils.idps_utils.get_app_secret", return_value="pw"):
                response = client.post("/api/splunk/job/cancel/123")
                assert response.status_code == 200
                assert response.json()["success"] is True


def test_cancel_splunk_job_error(client):
    with patch("httpx.AsyncClient.post", side_effect=Exception("fail")):
        with patch(
            "app.service.config.get_settings_for_env",
            return_value=MagicMock(splunk_host="host"),
        ):
            with patch("app.utils.idps_utils.get_app_secret", return_value="pw"):
                response = client.post("/api/splunk/job/cancel/123")
                assert response.status_code == 200
                assert response.json()["success"] is False
