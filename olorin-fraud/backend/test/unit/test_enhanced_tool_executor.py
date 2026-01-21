"""
Unit tests for Enhanced Tool Executor - Phase 1 of LangGraph enhancement.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch

import pytest
from langchain.tools import BaseTool
from pydantic import BaseModel

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.service.agent.orchestration.enhanced_tool_executor import (
    CircuitState,
    EnhancedToolNode,
    ToolHealthManager,
    ToolHealthMetrics,
)


class MockToolInput(BaseModel):
    """Mock tool input schema."""

    query: str = "default query"


class MockTool(BaseTool):
    """Mock tool for testing."""

    name: str = "test_tool"
    description: str = "Test tool"
    args_schema = MockToolInput

    def __init__(
        self, name: str = "test_tool", description: str = "Test tool", **kwargs
    ):
        super().__init__(name=name, description=description, **kwargs)

    def _run(self, query: str = "default", **kwargs) -> str:
        """Mock run method."""
        return f"Mock result for {query}"

    async def _arun(self, query: str = "default", **kwargs) -> str:
        """Mock async run method."""
        return f"Mock async result for {query}"


@pytest.fixture
def mock_tools():
    """Create mock tools for testing."""
    return [
        MockTool("tool1", "First test tool"),
        MockTool("tool2", "Second test tool"),
        MockTool("tool3", "Third test tool"),
    ]


@pytest.fixture
def enhanced_executor(mock_tools):
    """Create enhanced executor with mock tools."""
    return EnhancedToolNode(mock_tools)


@pytest.fixture
def health_manager():
    """Create tool health manager."""
    return ToolHealthManager()


class TestEnhancedToolNode:
    """Test enhanced tool executor functionality."""

    @pytest.mark.asyncio
    async def test_executor_initialization(self, enhanced_executor, mock_tools):
        """Test executor initializes correctly."""
        assert enhanced_executor is not None
        assert len(enhanced_executor.tools) == len(mock_tools)
        assert len(enhanced_executor.tool_metrics) == len(mock_tools)

        # Check metrics are initialized
        for tool in mock_tools:
            assert tool.name in enhanced_executor.tool_metrics
            metrics = enhanced_executor.tool_metrics[tool.name]
            assert metrics.circuit_state == CircuitState.CLOSED
            assert metrics.success_count == 0
            assert metrics.failure_count == 0

    @pytest.mark.asyncio
    async def test_successful_execution(self, enhanced_executor):
        """Test successful tool execution."""
        # Create proper input state with tool calls (LangGraph format)
        input_state = {
            "messages": [
                {
                    "tool_calls": [
                        {"name": "tool1", "args": {"query": "test"}, "id": "call_123"}
                    ]
                }
            ]
        }
        config = {}

        # Mock the parent ainvoke method
        with patch.object(
            enhanced_executor.__class__.__bases__[0], "ainvoke", new_callable=AsyncMock
        ) as mock_ainvoke:
            mock_ainvoke.return_value = input_state

            result = await enhanced_executor.ainvoke(input_state, config)

            assert result is not None

            # Check metrics updated
            metrics = enhanced_executor.tool_metrics["tool1"]
            assert metrics.success_count == 1
            assert metrics.failure_count == 0
            assert metrics.consecutive_failures == 0

    @pytest.mark.asyncio
    async def test_retry_on_failure(self, enhanced_executor):
        """Test retry logic on retryable failures."""
        # Create proper input state with tool calls (LangGraph format)
        input_state = {
            "messages": [
                {
                    "tool_calls": [
                        {"name": "tool1", "args": {"query": "test"}, "id": "call_123"}
                    ]
                }
            ]
        }
        config = {}

        # Mock to fail twice then succeed
        call_count = 0

        async def mock_ainvoke(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Connection failed")
            return input_state

        with patch.object(
            enhanced_executor.__class__.__bases__[0],
            "ainvoke",
            side_effect=mock_ainvoke,
        ):
            with patch("asyncio.sleep", new_callable=AsyncMock):  # Skip actual sleep
                result = await enhanced_executor.ainvoke(input_state, config)

                assert result is not None
                assert call_count == 3

                # Check metrics
                metrics = enhanced_executor.tool_metrics["tool1"]
                assert metrics.success_count == 1
                assert metrics.consecutive_failures == 0

    @pytest.mark.asyncio
    async def test_circuit_breaker_opens(self, enhanced_executor):
        """Test circuit breaker opens after threshold failures."""
        tool_call = {"name": "tool1", "args": {}}
        config = {}

        # Mock to always fail
        async def mock_ainvoke(*args, **kwargs):
            raise ConnectionError("Connection failed")

        enhanced_executor.circuit_config["failure_threshold"] = 3
        enhanced_executor.retry_config["max_retries"] = 1

        with patch.object(
            enhanced_executor.__class__.__bases__[0],
            "ainvoke",
            side_effect=mock_ainvoke,
        ):
            with patch("asyncio.sleep", new_callable=AsyncMock):
                # Fail multiple times to open circuit
                for _ in range(3):
                    with pytest.raises(ConnectionError):
                        await enhanced_executor.execute_with_resilience(
                            tool_call, config
                        )

                # Check circuit is open
                metrics = enhanced_executor.tool_metrics["tool1"]
                assert metrics.circuit_state == CircuitState.OPEN
                assert metrics.consecutive_failures >= 3

                # Next call should fail immediately with circuit open
                with pytest.raises(Exception, match="Circuit breaker OPEN"):
                    await enhanced_executor.execute_with_resilience(tool_call, config)

    @pytest.mark.asyncio
    async def test_circuit_breaker_recovery(self, enhanced_executor):
        """Test circuit breaker recovery to half-open and closed states."""
        tool_call = {"name": "tool1", "args": {}}
        config = {}

        # Set circuit to open state
        metrics = enhanced_executor.tool_metrics["tool1"]
        metrics.circuit_state = CircuitState.OPEN
        metrics.last_failure_time = datetime.now() - timedelta(seconds=61)

        # Mock successful execution
        with patch.object(
            enhanced_executor.__class__.__bases__[0], "ainvoke", new_callable=AsyncMock
        ) as mock_ainvoke:
            mock_ainvoke.return_value = {"result": "success"}

            result = await enhanced_executor.execute_with_resilience(tool_call, config)

            assert result == {"result": "success"}
            assert metrics.circuit_state == CircuitState.CLOSED

    def test_health_report(self, enhanced_executor):
        """Test health report generation."""
        # Set some metrics
        enhanced_executor.tool_metrics["tool1"].success_count = 10
        enhanced_executor.tool_metrics["tool1"].failure_count = 2
        enhanced_executor.tool_metrics["tool1"].total_latency = 12.0

        report = enhanced_executor.get_health_report()

        assert "tool1" in report
        assert report["tool1"]["success_rate"] == "83.3%"
        assert report["tool1"]["average_latency"] == "1.00s"
        assert report["tool1"]["circuit_state"] == "closed"
        assert report["tool1"]["total_requests"] == 12

    def test_get_working_tools(self, enhanced_executor):
        """Test getting list of working tools."""
        # Set one tool to open circuit
        enhanced_executor.tool_metrics["tool2"].circuit_state = CircuitState.OPEN

        working_tools = enhanced_executor.get_working_tools()

        assert len(working_tools) == 2
        tool_names = [t.name for t in working_tools]
        assert "tool1" in tool_names
        assert "tool3" in tool_names
        assert "tool2" not in tool_names


class TestToolHealthManager:
    """Test tool health manager functionality."""

    @pytest.mark.asyncio
    async def test_validate_tool_ecosystem(self, health_manager, mock_tools):
        """Test tool ecosystem validation."""
        healthy_tools = await health_manager.validate_tool_ecosystem(mock_tools)

        assert len(healthy_tools) == len(mock_tools)
        for tool in healthy_tools:
            assert hasattr(tool, "name")
            assert hasattr(tool, "description")

    @pytest.mark.asyncio
    async def test_filter_unhealthy_tools(self, health_manager):
        """Test filtering of unhealthy tools."""
        # Create mix of healthy and unhealthy tools
        tools = [
            MockTool("healthy1"),
            Mock(spec=[]),  # Unhealthy - no name attribute
            MockTool("healthy2"),
            Mock(name=None),  # Unhealthy - name is None
        ]

        healthy_tools = await health_manager.validate_tool_ecosystem(tools)

        assert len(healthy_tools) == 2
        assert all(hasattr(t, "name") and t.name for t in healthy_tools)

    def test_performance_recording(self, health_manager):
        """Test performance metric recording."""
        health_manager.record_performance("tool1", 1.5)
        health_manager.record_performance("tool1", 2.0)
        health_manager.record_performance("tool1", 1.0)

        assert "tool1" in health_manager.performance_metrics
        assert len(health_manager.performance_metrics["tool1"]) == 3
        assert sum(health_manager.performance_metrics["tool1"]) / 3 == 1.5

    def test_performance_ranking(self, health_manager, mock_tools):
        """Test tool ranking by performance."""
        # Record different latencies
        health_manager.record_performance("tool1", 3.0)
        health_manager.record_performance("tool2", 1.0)
        health_manager.record_performance("tool3", 2.0)

        ranked_tools = health_manager._rank_by_performance(mock_tools)

        # Should be sorted by average latency (best first)
        assert ranked_tools[0].name == "tool2"
        assert ranked_tools[1].name == "tool3"
        assert ranked_tools[2].name == "tool1"

    def test_health_check_timing(self, health_manager):
        """Test health check timing logic."""
        # Initially should perform health check
        assert health_manager.should_perform_health_check() is True

        # Update last check time
        health_manager.last_health_check = datetime.now()
        assert health_manager.should_perform_health_check() is False

        # Simulate time passing
        health_manager.last_health_check = datetime.now() - timedelta(seconds=61)
        assert health_manager.should_perform_health_check() is True


class TestToolHealthMetrics:
    """Test tool health metrics calculations."""

    def test_average_latency_calculation(self):
        """Test average latency calculation."""
        metrics = ToolHealthMetrics(tool_name="test")

        # No requests
        assert metrics.average_latency == 0.0

        # With requests
        metrics.success_count = 5
        metrics.failure_count = 2
        metrics.total_latency = 14.0
        assert metrics.average_latency == 2.0

    def test_success_rate_calculation(self):
        """Test success rate calculation."""
        metrics = ToolHealthMetrics(tool_name="test")

        # No requests
        assert metrics.success_rate == 1.0

        # With requests
        metrics.success_count = 8
        metrics.failure_count = 2
        assert metrics.success_rate == 0.8
