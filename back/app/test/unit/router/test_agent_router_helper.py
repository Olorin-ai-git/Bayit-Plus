# test_agent_router_helper.py
import pytest

from app.models.agent_headers import AuthContext, OlorinHeader
from app.models.agent_request import (
    Agent,
    AgentInput,
    AgentRequest,
    ContentItem,
    Context,
    Metadata,
)


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


def test_construct_agent_context(mock_request, agent_request):
    from app.models.agent_context import AgentContext
    from app.router.agent_router_helper import construct_agent_context

    agent_context = construct_agent_context(mock_request, agent_request)

    assert isinstance(agent_context, AgentContext)
    assert agent_context.input == "Test Input"
    assert agent_context.metadata == Metadata(
        interactionGroupId="sample_session_id",
        supportedOutputFormats=[],
        additionalMetadata={},
    )
    assert isinstance(agent_context.olorin_header, OlorinHeader)
    assert agent_context.olorin_header.olorin_tid == "sample_tid"
    assert agent_context.olorin_header.olorin_experience_id == "sample_experience_id"
    assert (
        agent_context.olorin_header.olorin_originating_assetalias == "sample_assetalias"
    )
    assert isinstance(agent_context.olorin_header.auth_context, AuthContext)
    assert agent_context.olorin_header.auth_context.olorin_user_id == "sample_user_id"
    assert agent_context.olorin_header.auth_context.olorin_user_token == "sample_token"
    assert agent_context.olorin_header.auth_context.olorin_realmid == "sample_realmid"
