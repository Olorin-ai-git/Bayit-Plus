"""
Tests for NLP Agent Executor

Validates multi-step agent workflow execution with tool use.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.services.nlp.agent_executor import AgentExecutor, AgentExecutionResult


@pytest.mark.asyncio
async def test_agent_execution_simple_query():
    """Test simple agent execution with single tool call"""
    executor = AgentExecutor()

    # Mock Claude response with tool use
    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="tool_use",
            id="tool_1",
            name="web_search",
            input={"query": "what is mongodb", "num_results": 3}
        )
    ]
    mock_response.usage = Mock(input_tokens=100, output_tokens=50)
    mock_response.stop_reason = "tool_use"

    # Second response after tool result
    mock_response_2 = Mock()
    mock_response_2.content = [
        Mock(
            type="text",
            text="MongoDB is a NoSQL database. TASK_COMPLETE"
        )
    ]
    mock_response_2.usage = Mock(input_tokens=120, output_tokens=30)
    mock_response_2.stop_reason = "end_turn"

    with patch.object(executor.client.messages, 'create', side_effect=[mock_response, mock_response_2]):
        with patch('app.services.nlp.agent_executor.execute_tool', new_callable=AsyncMock) as mock_execute_tool:
            mock_execute_tool.return_value = "MongoDB is a NoSQL database..."

            result = await executor.execute(
                query="what is mongodb",
                platform="bayit",
                dry_run=False,
                max_iterations=5,
                budget_limit_usd=0.10
            )

    assert result.success is True
    assert len(result.tool_calls) == 1
    assert result.tool_calls[0]["tool"] == "web_search"
    assert result.iterations == 2
    assert result.total_cost > 0


@pytest.mark.asyncio
async def test_agent_execution_multiple_tools():
    """Test agent execution with multiple tool calls"""
    executor = AgentExecutor()

    # First response: web search
    mock_response_1 = Mock()
    mock_response_1.content = [
        Mock(
            type="tool_use",
            id="tool_1",
            name="web_search",
            input={"query": "fraud detection methods"}
        )
    ]
    mock_response_1.usage = Mock(input_tokens=100, output_tokens=50)

    # Second response: generate PDF
    mock_response_2 = Mock()
    mock_response_2.content = [
        Mock(
            type="tool_use",
            id="tool_2",
            name="generate_pdf",
            input={"title": "Fraud Report", "data": {}}
        )
    ]
    mock_response_2.usage = Mock(input_tokens=120, output_tokens=60)

    # Third response: completion
    mock_response_3 = Mock()
    mock_response_3.content = [
        Mock(
            type="text",
            text="Report generated. TASK_COMPLETE"
        )
    ]
    mock_response_3.usage = Mock(input_tokens=130, output_tokens=20)

    with patch.object(executor.client.messages, 'create', side_effect=[mock_response_1, mock_response_2, mock_response_3]):
        with patch('app.services.nlp.agent_executor.execute_tool', new_callable=AsyncMock) as mock_execute_tool:
            mock_execute_tool.side_effect = [
                "Fraud detection methods include...",
                "/tmp/fraud_report.pdf"
            ]

            result = await executor.execute(
                query="research fraud detection and generate a report",
                platform="fraud",
                dry_run=False,
                max_iterations=10
            )

    assert result.success is True
    assert len(result.tool_calls) == 2
    assert result.iterations == 3


@pytest.mark.asyncio
async def test_agent_execution_dry_run():
    """Test agent execution in dry-run mode"""
    executor = AgentExecutor()

    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="tool_use",
            id="tool_1",
            name="upload_content",
            input={"source": "/usb", "content_type": "series"}
        )
    ]
    mock_response.usage = Mock(input_tokens=100, output_tokens=50)

    mock_response_2 = Mock()
    mock_response_2.content = [
        Mock(
            type="text",
            text="Would upload content. TASK_COMPLETE"
        )
    ]
    mock_response_2.usage = Mock(input_tokens=110, output_tokens=30)

    with patch.object(executor.client.messages, 'create', side_effect=[mock_response, mock_response_2]):
        with patch('app.services.nlp.agent_executor.execute_tool', new_callable=AsyncMock) as mock_execute_tool:
            mock_execute_tool.return_value = "[DRY RUN] Would upload content"

            result = await executor.execute(
                query="upload content from usb",
                platform="bayit",
                dry_run=True
            )

    assert result.success is True
    assert "[DRY RUN]" in result.tool_calls[0]["output"]


@pytest.mark.asyncio
async def test_agent_execution_max_iterations():
    """Test agent execution stops at max iterations"""
    executor = AgentExecutor()

    # Create responses that would exceed max iterations
    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="tool_use",
            id="tool_1",
            name="web_search",
            input={"query": "test"}
        )
    ]
    mock_response.usage = Mock(input_tokens=100, output_tokens=50)

    with patch.object(executor.client.messages, 'create', return_value=mock_response):
        with patch('app.services.nlp.agent_executor.execute_tool', new_callable=AsyncMock) as mock_execute_tool:
            mock_execute_tool.return_value = "Result"

            result = await executor.execute(
                query="infinite task",
                platform="bayit",
                max_iterations=3
            )

    assert result.iterations == 3


@pytest.mark.asyncio
async def test_agent_execution_budget_limit():
    """Test agent execution stops when budget limit reached"""
    executor = AgentExecutor()

    # Create expensive responses
    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="tool_use",
            id="tool_1",
            name="web_search",
            input={"query": "test"}
        )
    ]
    # High token count to exceed budget quickly
    mock_response.usage = Mock(input_tokens=10000, output_tokens=5000)

    with patch.object(executor.client.messages, 'create', return_value=mock_response):
        with patch('app.services.nlp.agent_executor.execute_tool', new_callable=AsyncMock) as mock_execute_tool:
            mock_execute_tool.return_value = "Result"

            result = await executor.execute(
                query="expensive task",
                platform="bayit",
                budget_limit_usd=0.10  # Low budget
            )

    # Should stop due to budget
    assert result.total_cost <= 0.11  # Allow small margin


@pytest.mark.asyncio
async def test_agent_execution_platform_tools():
    """Test agent uses platform-specific tools"""
    executor = AgentExecutor()

    mock_response = Mock()
    mock_response.content = [
        Mock(
            type="tool_use",
            id="tool_1",
            name="search_bayit_content",
            input={"query": "family ties"}
        )
    ]
    mock_response.usage = Mock(input_tokens=100, output_tokens=50)

    mock_response_2 = Mock()
    mock_response_2.content = [
        Mock(
            type="text",
            text="Found content. TASK_COMPLETE"
        )
    ]
    mock_response_2.usage = Mock(input_tokens=110, output_tokens=20)

    with patch.object(executor.client.messages, 'create', side_effect=[mock_response, mock_response_2]):
        with patch('app.services.nlp.agent_executor.execute_tool', new_callable=AsyncMock) as mock_execute_tool:
            mock_execute_tool.return_value = "Found 5 items"

            result = await executor.execute(
                query="search for family ties",
                platform="bayit"
            )

    assert result.success is True
    assert result.tool_calls[0]["tool"] == "search_bayit_content"
