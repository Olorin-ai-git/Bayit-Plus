from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio  # Explicitly import pytest_asyncio
from openai import (
    APIConnectionError,
    AuthenticationError,
    PermissionDeniedError,
    RateLimitError,
)

from app.models.agent_headers import AuthContext, OlorinHeader
from app.service.agent_service import ainvoke_agent
from app.service.config import get_settings_for_env
from app.service.error_handling import (
    AgentInvokeException,
    AuthorizationError,
    ClientException,
)

settings_for_env = get_settings_for_env()


@pytest.fixture
def mock_agent_context():
    from app.models.agent_context import AgentContext

    context = MagicMock(spec=AgentContext)
    context.input = "Test Input"
    context.thread_id = "sample_thread_id"

<<<<<<< HEAD:back/app/test/unit/service/test_agent_service.py
    # Setup olorin header
=======
    # Setup olorin header
>>>>>>> restructure-projects:olorin-server/app/test/unit/service/test_agent_service.py
    header = MagicMock(spec=OlorinHeader)
    auth = MagicMock(spec=AuthContext)
    auth.olorin_user_id = "sample_user_id"
    auth.olorin_user_token = "sample_token"
    auth.olorin_realmid = "sample_realmid"
    header.auth_context = auth
    header.olorin_tid = "sample_tid"
    header.olorin_experience_id = "sample_experience_id"
    header.olorin_originating_assetalias = "sample_assetalias"

    context.olorin_header = header
    context.get_header.return_value = {
        "Authorization": "Bearer sample_token",
        "olorin-tid": "sample_tid",
    }

    return context


@pytest.fixture
def mock_request():
    request = MagicMock()
    graph_parallel = AsyncMock()
    graph_parallel.ainvoke = AsyncMock()
    graph_parallel.ainvoke.return_value = {
        "messages": [
            MagicMock(content="Initial message"),
            MagicMock(content="Response message"),
        ]
    }
    graph_sequential = AsyncMock()
    graph_sequential.ainvoke = AsyncMock()
    graph_sequential.ainvoke.return_value = {
        "messages": [
            MagicMock(content="Initial message"),
            MagicMock(content="Response message"),
        ]
    }
    request.app.state.graph_parallel = graph_parallel
    request.app.state.graph_sequential = graph_sequential
    return request


@pytest.mark.asyncio
@patch("app.service.agent_service.CallbackHandler")
@patch("app.service.agent_service.get_app_secret")
@patch("app.service.agent_service.get_settings_for_env")
async def test_ainvoke_agent(
    mock_get_settings,
    mock_get_app_secret,
    mock_callback_handler,
    mock_request,
    mock_agent_context,
):
    # Setup mocks
    mock_settings = MagicMock()
    mock_settings.langfuse_public_key = "langfuse_public_key"
    mock_settings.langfuse_secret_key = "langfuse_secret_key"
    mock_settings.langfuse_host = "https://langfuse.example.com"
    mock_settings.app_id = "test_app_id"
    mock_get_settings.return_value = mock_settings

    mock_get_app_secret.side_effect = ["public_key_value", "secret_key_value"]

    mock_langfuse_handler = MagicMock()
    if settings_for_env.enable_langfuse:
        mock_langfuse_handler.langfuse.trace_id = "test-trace-id"
    else:
        mock_langfuse_handler.langfuse.trace_id = ""
    mock_callback_handler.return_value = mock_langfuse_handler

    # Create a proper mock message object
    mock_message = MagicMock()
    mock_message.content = (
        '{"overall_risk_score": 0.42, "accumulated_llm_thoughts": "Test LLM thoughts"}'
    )

    # Patch the ainvoke mock to return a dict (not tuple) - use sequential graph since parallel is forced to False
    mock_request.app.state.graph_sequential.ainvoke.return_value = {
        "messages": [mock_message]
    }
    response, trace_id = await ainvoke_agent(mock_request, mock_agent_context)

    # Assertions
    assert (
        response
        == '{"overall_risk_score": 0.42, "accumulated_llm_thoughts": "Test LLM thoughts"}'
    )
    assert (
        trace_id is None
    )  # Since we're not returning a tuple, trace_id should be None

    # Verify the graph was invoked with correct parameters
    mock_request.app.state.graph_sequential.ainvoke.assert_called_once()
    call_args = mock_request.app.state.graph_sequential.ainvoke.call_args[0][0]
    assert "messages" in call_args
    assert call_args["messages"][0].content == "Test Input"


@pytest.mark.asyncio
@patch("app.service.agent_service.CallbackHandler")
@patch("app.service.agent_service.get_app_secret")
@patch("app.service.agent_service.get_settings_for_env")
async def test_ainvoke_agent_exception_handling(
    mock_get_settings,
    mock_get_app_secret,
    mock_callback_handler,
    mock_request,
    mock_agent_context,
):
    # Setup mocks
    mock_settings = MagicMock()
    mock_settings.langfuse_public_key = "langfuse_public_key"
    mock_settings.langfuse_secret_key = "langfuse_secret_key"
    mock_settings.langfuse_host = "https://langfuse.example.com"
    mock_settings.app_id = "test_app_id"
    mock_get_settings.return_value = mock_settings

    mock_get_app_secret.side_effect = ["public_key_value", "secret_key_value"]

    mock_langfuse_handler = MagicMock()
    mock_langfuse_handler.langfuse.trace_id = "test-trace-id"
    mock_callback_handler.return_value = mock_langfuse_handler

    # Simulate an exception in the ainvoke method
    mock_request.app.state.graph_sequential.ainvoke.side_effect = AgentInvokeException(
        "Simulated exception"
    )

    # Call the function and assert exception
    with pytest.raises(AgentInvokeException) as excinfo:
        await ainvoke_agent(mock_request, mock_agent_context)

    assert str(excinfo.value) == "Simulated exception"

    # Verify the graph was invoked and raised an exception
    mock_request.app.state.graph_sequential.ainvoke.assert_called_once()


@pytest.mark.asyncio
@patch("app.service.agent_service.CallbackHandler")
@patch("app.service.agent_service.get_app_secret")
@patch("app.service.agent_service.get_settings_for_env")
async def test_ainvoke_agent_authentication_error(
    mock_get_settings,
    mock_get_app_secret,
    mock_callback_handler,
    mock_request,
    mock_agent_context,
):
    # Setup mocks
    mock_settings = MagicMock()
    mock_response = AsyncMock()
    mock_get_settings.return_value = mock_settings

    # Simulate an AuthenticationError in the ainvoke method
    mock_request.app.state.graph_sequential.ainvoke.side_effect = AuthenticationError(
        message="Authentication failed", response=mock_response, body=None
    )

    # Call the function and assert exception
    with pytest.raises(AuthorizationError) as excinfo:
        await ainvoke_agent(mock_request, mock_agent_context)

    assert "Authentication failed" in str(excinfo.value)


@pytest.mark.asyncio
@patch("app.service.agent_service.CallbackHandler")
@patch("app.service.agent_service.get_app_secret")
@patch("app.service.agent_service.get_settings_for_env")
async def test_ainvoke_agent_permission_denied_error(
    mock_get_settings,
    mock_get_app_secret,
    mock_callback_handler,
    mock_request,
    mock_agent_context,
):
    # Setup mocks
    mock_settings = MagicMock()
    mock_response = AsyncMock()
    mock_get_settings.return_value = mock_settings

    # Simulate a PermissionDeniedError in the ainvoke method
    mock_request.app.state.graph_sequential.ainvoke.side_effect = PermissionDeniedError(
        message="Permission denied", response=mock_response, body=None
    )

    # Call the function and assert exception
    with pytest.raises(ClientException) as excinfo:
        await ainvoke_agent(mock_request, mock_agent_context)

    assert "Permission denied" in str(excinfo.value)


@pytest.mark.asyncio
@patch("app.service.agent_service.CallbackHandler")
@patch("app.service.agent_service.get_app_secret")
@patch("app.service.agent_service.get_settings_for_env")
async def test_ainvoke_agent_rate_limit_error(
    mock_get_settings,
    mock_get_app_secret,
    mock_callback_handler,
    mock_request,
    mock_agent_context,
):
    # Setup mocks
    mock_settings = MagicMock()
    mock_response = AsyncMock()
    mock_get_settings.return_value = mock_settings

    # Simulate a RateLimitError in the ainvoke method
    mock_request.app.state.graph_sequential.ainvoke.side_effect = RateLimitError(
        message="Rate limit exceeded", response=mock_response, body=None
    )

    # Call the function and assert exception
    with pytest.raises(ClientException) as excinfo:
        await ainvoke_agent(mock_request, mock_agent_context)

    assert "Rate limit exceeded" in str(excinfo.value)


@pytest.mark.asyncio
@patch("app.service.agent_service.CallbackHandler")
@patch("app.service.agent_service.get_app_secret")
@patch("app.service.agent_service.get_settings_for_env")
async def test_ainvoke_agent_api_connection_error(
    mock_get_settings,
    mock_get_app_secret,
    mock_callback_handler,
    mock_request,
    mock_agent_context,
):
    # Setup mocks
    mock_settings = MagicMock()
    mock_get_settings.return_value = mock_settings

    # Simulate an APIConnectionError in the ainvoke method
    mock_request.app.state.graph_sequential.ainvoke.side_effect = APIConnectionError(
        message="API failed", request=mock_request
    )

    # Call the function and assert exception
    with pytest.raises(AgentInvokeException) as excinfo:
        await ainvoke_agent(mock_request, mock_agent_context)

    assert "API failed" in str(excinfo.value)


@pytest.mark.asyncio
@patch("app.service.agent_service.CallbackHandler")
@patch("app.service.agent_service.get_app_secret")
@patch("app.service.agent_service.get_settings_for_env")
async def test_ainvoke_agent_generic_exception(
    mock_get_settings,
    mock_get_app_secret,
    mock_callback_handler,
    mock_request,
    mock_agent_context,
):
    # Setup mocks
    mock_settings = MagicMock()
    mock_get_settings.return_value = mock_settings

    # Simulate a generic Exception in the ainvoke method
    mock_request.app.state.graph_sequential.ainvoke.side_effect = Exception(
        "unexpected error"
    )

    # Call the function and assert AgentInvokeException is raised
    with pytest.raises(AgentInvokeException) as excinfo:
        await ainvoke_agent(mock_request, mock_agent_context)
    assert "unexpected error" in str(excinfo.value)


def test_agent_response_str():
    from app.models.agent_response import (
        AgentMetadata,
        AgentOutput,
        AgentResponse,
        Output,
        OutputFormat,
    )

    output_format = OutputFormat(
        format="json", formatterVersion="1.0", formatterName="test"
    )
    output = Output(content="foo", outputFormat=output_format)
    agent_output = AgentOutput(plainText="bar", outputs=[output])
    agent_metadata = AgentMetadata(agentTraceId="trace123")
    response = AgentResponse(agentOutput=agent_output, agentMetadata=agent_metadata)
    s = str(response)
    assert "trace123" in s and "bar" in s and "foo" in s


<<<<<<< HEAD:back/app/test/unit/service/test_agent_service.py
def test_olorin_header_str():
=======
def test_olorin_header_str():
>>>>>>> restructure-projects:olorin-server/app/test/unit/service/test_agent_service.py
    from app.models.agent_headers import AuthContext, OlorinHeader

    auth_ctx = AuthContext(
        olorin_user_id="u", olorin_user_token="t", olorin_realmid="r"
    )
    header = OlorinHeader(
<<<<<<< HEAD:back/app/test/unit/service/test_agent_service.py
        olorin_tid="tid1",
        olorin_experience_id="expid1",
        olorin_originating_assetalias="alias1",
=======
        olorin_tid="tid1",
        olorin_experience_id="expid1",
        olorin_originating_assetalias="alias1",
>>>>>>> restructure-projects:olorin-server/app/test/unit/service/test_agent_service.py
        auth_context=auth_ctx,
    )
    s = str(header)
    assert "tid1" in s and "expid1" in s and "alias1" in s


def test_check_route_allowed_raises_authorization_error():
    import types

    from fastapi import Request

    from app.service.auth import check_route_allowed
    from app.service.config import SvcSettings
    from app.service.error_handling import AuthorizationError

    # Use a MagicMock for settings
    fake_settings = MagicMock(spec=SvcSettings)
    fake_settings.mesh_port = 1234
    # Create a fake request with a path not in MESH_SKIPPED_ROUTES and no X-Forwarded-Port
    fake_request = MagicMock(spec=Request)
    fake_request.headers = {}
    fake_request.url.path = "/not/skipped"
    # Should raise AuthorizationError
    with pytest.raises(AuthorizationError):
        import asyncio

        asyncio.run(check_route_allowed(fake_request, fake_settings))


@pytest.mark.asyncio
async def test_ainvoke_agent_output_content_string(mock_request, mock_agent_context):
    # Patch ainvoke to return a string (not a dict with 'messages')
    mock_request.app.state.graph_sequential.ainvoke.return_value = "just a string"
    from app.service.agent_service import ainvoke_agent

    # Should not raise, should return the string and None as trace_id
    result, trace_id = await ainvoke_agent(mock_request, mock_agent_context)
    assert result == "just a string"
    assert trace_id is None


def test_check_route_allowed_x_forwarded_port(monkeypatch):
    import asyncio
    import types

    from fastapi import Request

    from app.service.auth import check_route_allowed
    from app.service.config import SvcSettings

    # Use a MagicMock for settings
    fake_settings = types.SimpleNamespace(mesh_port=1234)
    # Create a fake request with X-Forwarded-Port header matching mesh_port
    fake_request = types.SimpleNamespace()
    fake_request.headers = {"X-Forwarded-Port": "1234"}
    fake_request.url = types.SimpleNamespace(path="/not/skipped")
    # Should not raise
    asyncio.run(check_route_allowed(fake_request, fake_settings))


def test_check_route_allowed_raises_final_authorization_error():
    import asyncio
    import types

    from app.service.auth import check_route_allowed
    from app.service.error_handling import AuthorizationError

    # Not LocalSettings, no X-Forwarded-Port, not a skipped route
    fake_settings = types.SimpleNamespace(mesh_port=1234)
    fake_request = types.SimpleNamespace()
    fake_request.headers = {}
    fake_request.url = types.SimpleNamespace(path="/not/skipped")
    with pytest.raises(AuthorizationError):
        asyncio.run(check_route_allowed(fake_request, fake_settings))
