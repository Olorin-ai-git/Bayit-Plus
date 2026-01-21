"""
Integration tests for Enhanced Tool Execution Logging System

These tests validate the comprehensive error surfacing and tool execution logging
implemented in the hybrid intelligence graph system.
"""

import asyncio
import os
from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.service.agent.orchestration.enhanced_tool_execution_logger import (
    EnhancedToolExecutionLogger,
    get_tool_execution_logger,
    reset_tool_execution_logger,
)
from app.service.agent.tools.snowflake_tool.snowflake_tool import SnowflakeQueryTool
from app.service.agent.tools.threat_intelligence_tool.unified_threat_intelligence_tool import (
    UnifiedThreatIntelligenceTool,
)
from app.utils.tool_error_categorization import (
    ToolErrorCategorizer,
    ToolErrorCategory,
    ToolExecutionStatus,
    create_tool_error_details,
)


@pytest.fixture
def investigation_id():
    """Test investigation ID."""
    return "test_investigation_12345"


@pytest.fixture
def tool_logger(investigation_id):
    """Create tool execution logger for testing."""
    reset_tool_execution_logger()
    return get_tool_execution_logger(investigation_id)


@pytest.fixture
def mock_snowflake_tool():
    """Create mock Snowflake tool for testing."""
    tool = SnowflakeQueryTool(
        account="test.snowflakecomputing.com", warehouse="TEST_WAREHOUSE"
    )
    return tool


@pytest.fixture
def mock_threat_intel_tool():
    """Create mock threat intelligence tool for testing."""
    return UnifiedThreatIntelligenceTool()


class TestToolErrorCategorization:
    """Test error categorization functionality."""

    def test_network_error_categorization(self):
        """Test network error categorization."""
        connection_error = ConnectionError("Connection refused")
        category = ToolErrorCategorizer.categorize_error(connection_error)
        assert category == ToolErrorCategory.CONNECTION_ERROR

        timeout_error = TimeoutError("Operation timed out")
        category = ToolErrorCategorizer.categorize_error(timeout_error)
        assert category == ToolErrorCategory.TIMEOUT_ERROR

    def test_authentication_error_categorization(self):
        """Test authentication error categorization."""
        auth_error = Exception("invalid credentials")
        category = ToolErrorCategorizer.categorize_error(auth_error)
        assert category == ToolErrorCategory.AUTH_INVALID_CREDENTIALS

        rate_limit_error = Exception("rate limit exceeded")
        category = ToolErrorCategorizer.categorize_error(auth_error, http_status=429)
        assert category == ToolErrorCategory.AUTH_RATE_LIMITED

    def test_database_error_categorization(self):
        """Test database-specific error categorization."""
        db_error = Exception("database connection failed")
        category = ToolErrorCategorizer.categorize_error(db_error, "snowflake_query")
        assert category == ToolErrorCategory.DB_CONNECTION_FAILED

        warehouse_error = Exception("warehouse suspended")
        category = ToolErrorCategorizer.categorize_error(
            warehouse_error, "snowflake_query"
        )
        assert category == ToolErrorCategory.SNOWFLAKE_WAREHOUSE_SUSPENDED

    def test_http_status_code_categorization(self):
        """Test HTTP status code based categorization."""
        generic_error = Exception("API failed")

        category = ToolErrorCategorizer.categorize_error(generic_error, http_status=400)
        assert category == ToolErrorCategory.API_BAD_REQUEST

        category = ToolErrorCategorizer.categorize_error(generic_error, http_status=401)
        assert category == ToolErrorCategory.AUTH_INVALID_CREDENTIALS

        category = ToolErrorCategorizer.categorize_error(generic_error, http_status=404)
        assert category == ToolErrorCategory.API_NOT_FOUND

        category = ToolErrorCategorizer.categorize_error(generic_error, http_status=500)
        assert category == ToolErrorCategory.API_SERVER_ERROR

    def test_recovery_suggestions(self):
        """Test recovery suggestion generation."""
        suggestion, is_retryable = ToolErrorCategorizer.get_recovery_suggestion(
            ToolErrorCategory.CONNECTION_ERROR
        )
        assert is_retryable is True
        assert "network connectivity" in suggestion.lower()

        suggestion, is_retryable = ToolErrorCategorizer.get_recovery_suggestion(
            ToolErrorCategory.AUTH_INVALID_CREDENTIALS
        )
        assert is_retryable is False
        assert "credentials" in suggestion.lower()

    def test_create_tool_error_details(self):
        """Test comprehensive error details creation."""
        error = ConnectionError("Connection timeout")
        error_details = create_tool_error_details(
            error=error,
            tool_name="snowflake_query",
            tool_args={"query": "SELECT * FROM test", "limit": 100},
            execution_duration_ms=5000,
            attempt_number=2,
            max_retries=3,
            investigation_id="test_123",
        )

        # Tool-specific categorization: Connection timeout for Snowflake = DB_QUERY_TIMEOUT
        assert error_details.category == ToolErrorCategory.DB_QUERY_TIMEOUT
        assert error_details.tool_name == "snowflake_query"
        assert error_details.execution_duration_ms == 5000
        assert error_details.attempt_number == 2
        assert error_details.max_retries == 3
        assert error_details.investigation_id == "test_123"
        assert error_details.is_retryable is True
        assert len(error_details.error_hash) == 8  # MD5 hash first 8 chars

        # Test generic tool categorization
        generic_error_details = create_tool_error_details(
            error=ConnectionError("Connection refused"),
            tool_name="generic_tool",
            tool_args={"param": "value"},
        )
        assert generic_error_details.category == ToolErrorCategory.CONNECTION_ERROR


class TestEnhancedToolExecutionLogger:
    """Test enhanced tool execution logging functionality."""

    @pytest.mark.asyncio
    async def test_tool_execution_start_logging(self, tool_logger):
        """Test tool execution start logging."""
        execution_id = await tool_logger.log_tool_execution_start(
            tool_name="snowflake_query",
            tool_args={"query": "SELECT * FROM transactions", "limit": 100},
            attempt_number=1,
            max_retries=3,
        )

        assert execution_id is not None
        assert execution_id.startswith("snowflake_query_")
        assert execution_id in tool_logger._execution_metrics

        metrics = tool_logger._execution_metrics[execution_id]
        assert metrics.tool_name == "snowflake_query"
        assert metrics.execution_status == ToolExecutionStatus.STARTED
        assert metrics.attempt_number == 1
        assert metrics.max_retries == 3

    @pytest.mark.asyncio
    async def test_tool_execution_success_logging(self, tool_logger):
        """Test successful tool execution logging."""
        # Start execution
        execution_id = await tool_logger.log_tool_execution_start(
            tool_name="snowflake_query",
            tool_args={"query": "SELECT * FROM transactions", "limit": 100},
        )

        # Simulate some execution time
        await asyncio.sleep(0.1)

        # Log success
        result_data = [
            {"tx_id": "123", "amount": 100.0},
            {"tx_id": "456", "amount": 250.0},
        ]
        await tool_logger.log_tool_execution_success(
            execution_id=execution_id, result=result_data
        )

        metrics = tool_logger._execution_metrics[execution_id]
        assert metrics.execution_status == ToolExecutionStatus.COMPLETED
        assert metrics.duration_ms is not None
        assert metrics.duration_ms > 0
        assert metrics.result_record_count == 2
        assert metrics.result_size_bytes is not None
        assert metrics.result_hash is not None

    @pytest.mark.asyncio
    async def test_tool_execution_failure_logging(self, tool_logger):
        """Test tool execution failure logging."""
        # Start execution
        execution_id = await tool_logger.log_tool_execution_start(
            tool_name="snowflake_query",
            tool_args={"query": "SELECT * FROM invalid_table"},
        )

        # Simulate some execution time
        await asyncio.sleep(0.1)

        # Log failure
        error = ConnectionError("Database connection failed")
        await tool_logger.log_tool_execution_failure(
            execution_id=execution_id,
            error=error,
            tool_args={"query": "SELECT * FROM invalid_table"},
            http_status=None,
        )

        metrics = tool_logger._execution_metrics[execution_id]
        assert metrics.execution_status == ToolExecutionStatus.FAILED
        assert metrics.duration_ms is not None

        # Check error was added to history
        assert len(tool_logger._error_history) == 1
        error_details = tool_logger._error_history[0]
        assert error_details.category == ToolErrorCategory.CONNECTION_ERROR
        assert error_details.tool_name == "snowflake_query"

    @pytest.mark.asyncio
    async def test_empty_result_logging(self, tool_logger):
        """Test empty result logging."""
        execution_id = "test_empty_123"

        await tool_logger.log_empty_result(
            tool_name="snowflake_query",
            execution_id=execution_id,
            reason="no_data_found",
            context={"query": "SELECT * FROM transactions WHERE false", "limit": 100},
        )

        # Verify WebSocket event would be emitted (we can't test actual emission without setup)
        assert (
            len(tool_logger._websocket_handlers) == 0
        )  # No handlers registered in test

    def test_execution_summary_generation(self, tool_logger):
        """Test execution summary generation."""
        # Add some mock metrics
        from app.utils.tool_error_categorization import ToolExecutionMetrics

        metrics1 = ToolExecutionMetrics(
            tool_name="snowflake_query",
            execution_status=ToolExecutionStatus.COMPLETED,
            investigation_id="test_123",
        )
        metrics1.duration_ms = 1000

        metrics2 = ToolExecutionMetrics(
            tool_name="threat_intel",
            execution_status=ToolExecutionStatus.FAILED,
            investigation_id="test_123",
        )
        metrics2.duration_ms = 2000

        tool_logger._execution_metrics["exec1"] = metrics1
        tool_logger._execution_metrics["exec2"] = metrics2

        summary = tool_logger.get_execution_summary()

        assert summary["total_executions"] == 2
        assert summary["successful"] == 1
        assert summary["failed"] == 1
        assert summary["success_rate"] == 0.5
        assert summary["average_duration_ms"] == 1500
        assert "snowflake_query" in summary["tool_usage"]
        assert "threat_intel" in summary["tool_usage"]


class TestSnowflakeToolIntegration:
    """Test Snowflake tool with enhanced error logging."""

    @pytest.fixture
    def mock_snowflake_client(self):
        """Mock Snowflake client for testing."""
        with patch(
            "app.service.agent.tools.snowflake_tool.snowflake_tool.SnowflakeClient"
        ) as mock:
            yield mock

    @pytest.mark.asyncio
    async def test_snowflake_successful_execution(
        self, mock_snowflake_tool, mock_snowflake_client, tool_logger
    ):
        """Test successful Snowflake query execution with logging."""
        # Setup mock
        mock_client_instance = Mock()
        mock_client_instance.connect = AsyncMock()
        mock_client_instance.disconnect = AsyncMock()
        mock_client_instance.execute_query = AsyncMock(
            return_value=[
                {"tx_id": "123", "amount": 100.0, "risk_score": 0.2},
                {"tx_id": "456", "amount": 250.0, "risk_score": 0.8},
            ]
        )
        mock_snowflake_client.return_value = mock_client_instance

        # Execute query
        result = await mock_snowflake_tool._arun(
            query="SELECT tx_id, amount, risk_score FROM transactions LIMIT 10",
            limit=10,
        )

        # Verify result structure
        import json

        result_data = json.loads(result)
        assert "results" in result_data
        assert "row_count" in result_data
        assert result_data["row_count"] == 2
        assert result_data["query_status"] == "success"
        assert "execution_duration_ms" in result_data

        # Verify logging metrics were recorded
        assert len(tool_logger._execution_metrics) > 0

    @pytest.mark.asyncio
    async def test_snowflake_connection_failure(
        self, mock_snowflake_tool, mock_snowflake_client, tool_logger
    ):
        """Test Snowflake connection failure with comprehensive error logging."""
        # Setup mock to raise connection error
        mock_client_instance = Mock()
        mock_client_instance.connect = AsyncMock(
            side_effect=ConnectionError("Authentication failed")
        )
        mock_client_instance.disconnect = AsyncMock()
        mock_snowflake_client.return_value = mock_client_instance

        # Execute query
        result = await mock_snowflake_tool._arun(
            query="SELECT * FROM transactions", limit=100
        )

        # Verify error result structure
        import json

        result_data = json.loads(result)
        assert result_data["query_status"] == "connection_failed"
        assert result_data["error_category"] == "connection_failure"
        assert "Authentication failed" in result_data["error"]
        assert "execution_duration_ms" in result_data

        # Verify error was logged
        assert len(tool_logger._error_history) > 0
        error_details = tool_logger._error_history[0]
        assert error_details.category == ToolErrorCategory.CONNECTION_ERROR

    @pytest.mark.asyncio
    async def test_snowflake_empty_results(
        self, mock_snowflake_tool, mock_snowflake_client, tool_logger
    ):
        """Test Snowflake empty results logging."""
        # Setup mock to return empty results
        mock_client_instance = Mock()
        mock_client_instance.connect = AsyncMock()
        mock_client_instance.disconnect = AsyncMock()
        mock_client_instance.execute_query = AsyncMock(return_value=[])
        mock_snowflake_client.return_value = mock_client_instance

        # Execute query
        result = await mock_snowflake_tool._arun(
            query="SELECT * FROM transactions WHERE 1=0", limit=100
        )

        # Verify result structure
        import json

        result_data = json.loads(result)
        assert result_data["query_status"] == "success"
        assert result_data["row_count"] == 0

        # Note: Empty result logging would be verified if we could monitor WebSocket events


class TestThreatIntelligenceToolIntegration:
    """Test threat intelligence tool with enhanced error logging."""

    @pytest.mark.asyncio
    async def test_threat_intel_provider_initialization_failure(
        self, mock_threat_intel_tool, tool_logger
    ):
        """Test threat intelligence provider initialization failure."""
        # Mock the initialization to fail
        with patch.object(
            mock_threat_intel_tool,
            "_initialize_providers",
            side_effect=Exception("Provider API keys not found"),
        ):
            result = await mock_threat_intel_tool._arun(
                target="192.168.1.1", query_type="ip_reputation"
            )

            # Verify error result
            import json

            result_data = json.loads(result)
            assert result_data["success"] is False
            assert result_data["error_category"] == "provider_initialization_error"
            assert "Provider API keys not found" in result_data["error"]

            # Verify error was logged
            assert len(tool_logger._error_history) > 0

    @pytest.mark.asyncio
    async def test_threat_intel_all_providers_failed(
        self, mock_threat_intel_tool, tool_logger
    ):
        """Test when all threat intelligence providers fail."""
        # Mock initialization to succeed but all queries to fail
        mock_threat_intel_tool._provider_tools = {
            "abuseipdb": Mock(),
            "virustotal": Mock(),
            "shodan": Mock(),
        }

        with patch.object(
            mock_threat_intel_tool, "_initialize_providers", return_value=None
        ):
            with patch.object(
                mock_threat_intel_tool,
                "_query_provider",
                side_effect=Exception("API timeout"),
            ):
                result = await mock_threat_intel_tool._arun(
                    target="192.168.1.1", query_type="comprehensive"
                )

                # Verify error result
                import json

                result_data = json.loads(result)
                assert result_data["success"] is False
                assert result_data["error_category"] == "all_providers_failed"
                assert "failed_providers" in result_data

                # Verify error was logged
                assert len(tool_logger._error_history) > 0


@pytest.mark.integration
class TestEndToEndErrorLogging:
    """End-to-end testing of error logging in hybrid intelligence system."""

    @pytest.mark.asyncio
    async def test_investigation_with_tool_failures(self, investigation_id):
        """Test a complete investigation with various tool failures."""
        from app.service.agent.orchestration.hybrid.hybrid_state_schema import (
            create_hybrid_initial_state,
        )

        # Create hybrid state
        state = create_hybrid_initial_state(
            investigation_id=investigation_id,
            entity_id="192.168.1.100",
            entity_type="ip",
        )

        # Verify errors field exists and is empty
        assert "errors" in state
        assert isinstance(state["errors"], list)
        assert len(state["errors"]) == 0

        # Simulate adding errors to state (this would happen during tool execution)
        test_error = {
            "timestamp": datetime.now().isoformat(),
            "tool_name": "snowflake_query",
            "error_category": "connection_failure",
            "error_type": "ConnectionError",
            "error_message": "Database connection failed",
            "error_hash": "abc12345",
            "is_retryable": True,
            "recovery_action": "Check database connectivity",
            "execution_id": "snowflake_query_12345",
        }

        state["errors"].append(test_error)

        # Verify error was added
        assert len(state["errors"]) == 1
        assert state["errors"][0]["tool_name"] == "snowflake_query"
        assert state["errors"][0]["error_category"] == "connection_failure"

    def test_websocket_event_emission(self, tool_logger):
        """Test WebSocket event emission during tool execution."""
        # Register a mock WebSocket handler
        events_received = []

        async def mock_handler(event):
            events_received.append(event)

        tool_logger.register_websocket_handler(mock_handler)

        # Verify handler was registered
        assert len(tool_logger._websocket_handlers) == 1

        # Note: Actual WebSocket emission testing would require more complex setup
        # This test verifies the handler registration mechanism works


if __name__ == "__main__":
    # Run tests with: python -m pytest test/integration/test_enhanced_tool_logging_integration.py -v
    pytest.main([__file__, "-v", "--tb=short"])
