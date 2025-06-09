from unittest.mock import ANY, AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio  # Explicitly import pytest_asyncio
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables.config import RunnableConfig

from app.models.upi_response import (
    AgentInput,
    AgentOutput,
    Content,
    Context,
    Interaction,
    InteractionsResponse,
    Metadata,
    Output,
    OutputFormat,
)
from app.service.agent.agent import (
    assistant,
    convert_interaction_to_langgraph_messages,
    create_and_get_agent_graph,
)


@pytest.fixture
def mock_agent_context():
    from app.models.agent_context import AgentContext
    from app.models.agent_headers import IntuitHeader

    context = MagicMock(spec=AgentContext)
    header = MagicMock(spec=IntuitHeader)
    context.get_header.return_value = {
        "Authorization": "Bearer sample_token",
        "intuit-tid": "sample_tid",
    }
    context.intuit_header = header
    return context


@pytest.fixture
def mock_messages_state():
    return {
        "messages": [HumanMessage(content="Hello, can you help me with my finances?")]
    }


@pytest.fixture
def mock_config(mock_agent_context):
    return {
        "configurable": {
            "agent_context": mock_agent_context,
            "thread_id": "sample_thread_id",
        }
    }


@patch("app.service.agent.agent.llm_with_tools")
def test_assistant(mock_llm_with_tools, mock_messages_state, mock_config):
    # Setup mock
    mock_llm_with_tools.invoke.return_value = AIMessage(
        content="I can help with your finances"
    )

    # Call the function
    result = assistant(mock_messages_state, mock_config)

    # Assertions
    assert "messages" in result
    assert len(result["messages"]) == 1
    assert result["messages"][0].content == "I can help with your finances"

    # Verify llm_with_tools was called with correct parameters
    mock_llm_with_tools.invoke.assert_called_once()
    args, kwargs = mock_llm_with_tools.invoke.call_args
    assert (
        kwargs["extra_headers"]
        == mock_config["configurable"]["agent_context"].get_header()
    )


@patch("app.service.agent.agent.AsyncRedisSaver")
@patch("app.service.agent.agent.MemorySaver")
@patch("app.service.agent.agent.StateGraph")
@patch("app.service.agent.agent.ToolNode")  # Explicitly patch ToolNode
@patch("app.service.agent.agent.get_settings_for_env")
def test_create_and_get_agent_graph(
    mock_get_settings,
    mock_tool_node,
    mock_state_graph,
    mock_memory_saver,
    mock_redis_saver,
):
    # Setup mocks
    mock_settings = MagicMock()
    mock_settings.use_ips_cache = False
    mock_get_settings.return_value = mock_settings

    # Create a mock for the ToolNode instance
    mock_tool_node_instance = MagicMock()
    mock_tool_node.return_value = mock_tool_node_instance

    mock_builder = MagicMock()
    mock_state_graph.return_value = mock_builder
    mock_graph = MagicMock()
    mock_builder.compile.return_value = mock_graph

    # Call the function
    result = create_and_get_agent_graph()

    # Assertions
    assert result == mock_graph

    # Verify the graph was built correctly
    mock_builder.add_node.assert_any_call("assistant", assistant)

    # Check that add_node was called with "tools" and the mock_tool_node_instance
    mock_builder.add_node.assert_any_call("tools", mock_tool_node_instance)

    # Verify that ToolNode was instantiated with the tools list
    mock_tool_node.assert_called_once()

    assert mock_builder.add_edge.call_count >= 2
    mock_builder.add_conditional_edges.assert_called_once()
    mock_builder.compile.assert_called_once()


@patch("app.service.agent.agent.AsyncRedisSaver")
@patch("app.service.agent.agent.MemorySaver")
@patch("app.service.agent.agent.StateGraph")
@patch("app.service.agent.agent.ToolNode")  # Explicitly patch ToolNode
@patch("app.service.agent.agent.get_settings_for_env")
def test_create_and_get_agent_graph_with_redis(
    mock_get_settings,
    mock_tool_node,
    mock_state_graph,
    mock_memory_saver,
    mock_redis_saver,
):
    # Setup mocks
    mock_settings = MagicMock()
    mock_settings.use_ips_cache = True
    mock_get_settings.return_value = mock_settings

    # Create a mock for the ToolNode instance
    mock_tool_node_instance = MagicMock()
    mock_tool_node.return_value = mock_tool_node_instance

    mock_builder = MagicMock()
    mock_state_graph.return_value = mock_builder
    mock_graph = MagicMock()
    mock_builder.compile.return_value = mock_graph

    # Call the function
    result = create_and_get_agent_graph()

    # Assertions
    assert result == mock_graph
    # If AsyncRedisSaver is used for checkpointer, we can assert this
    # mock_redis_saver.assert_called_once()
    # mock_builder.compile.assert_called_once_with(checkpointer=mock_redis_saver())


def test_convert_interaction_to_langgraph_messages():
    # Create mock interactions
    interaction_response = InteractionsResponse(
        interactions=[
            Interaction(
                role="user",
                createdDateTime="2023-01-01T00:00:00Z",
                metadata=Metadata(interactionGroupId="igdi1"),
                agentInput=AgentInput(content=[Content(text="Hello", type="text")]),
                agentOutput=AgentOutput(
                    plainText="abc",
                    outputs=[
                        Output(
                            content="Hi there!",
                            outputFormat=OutputFormat(
                                format="text",
                                formatterVersion="1.0",
                                formatterName="default",
                            ),
                        )
                    ],
                ),
                context=Context(),
            ),
            Interaction(
                role="user",
                createdDateTime="2023-01-01T00:00:00Z",
                metadata=Metadata(interactionGroupId="igid1"),
                agentInput=AgentInput(
                    content=[Content(text="How are you?", type="text")]
                ),
                agentOutput=AgentOutput(
                    plainText="abc",
                    outputs=[
                        Output(
                            content="I'm good, thanks!",
                            outputFormat=OutputFormat(
                                format="text",
                                formatterVersion="1.0",
                                formatterName="default",
                            ),
                        )
                    ],
                ),
                context=Context(),
            ),
        ]
    )

    # Call the function
    result = convert_interaction_to_langgraph_messages(
        interaction_response.interactions, interaction_group_id="igid1"
    )

    # Assertions
    assert len(result) == 2
    assert isinstance(result[0], HumanMessage)
    assert result[0].content == "Hello"
    assert isinstance(result[1], AIMessage)
    assert result[1].content == "Hi there!"
