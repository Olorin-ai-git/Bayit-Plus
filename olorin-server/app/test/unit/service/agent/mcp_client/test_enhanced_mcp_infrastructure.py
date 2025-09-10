"""Comprehensive tests for enhanced MCP infrastructure."""

import asyncio
import pytest
import time
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from app.service.agent.mcp_client.enhanced_mcp_client import EnhancedMCPClient, MCPCache
from app.service.agent.mcp_client.mcp_connection_pool import MCPConnectionPool, MCPConnection, ConnectionState
from app.service.agent.mcp_client.mcp_health_monitor import MCPHealthMonitor, HealthStatus, AlertSeverity
from app.service.agent.mcp_client.mcp_metrics import MCPMetricsCollector


@pytest.fixture
async def enhanced_mcp_client():
    """Create enhanced MCP client for testing."""
    with patch('redis.Redis'):
        client = EnhancedMCPClient(redis_url="redis://localhost:6379")
        await client.initialize()
        yield client
        await client.shutdown()


@pytest.fixture
async def connection_pool():
    """Create connection pool for testing."""
    pool = MCPConnectionPool(max_connections_per_server=5, min_connections_per_server=1)
    await pool.initialize()
    yield pool
    await pool.shutdown()


@pytest.fixture
async def health_monitor():
    """Create health monitor for testing."""
    monitor = MCPHealthMonitor(check_interval=1.0)
    await monitor.start_monitoring()
    yield monitor
    await monitor.stop_monitoring()


@pytest.fixture
def metrics_collector():
    """Create metrics collector for testing."""
    collector = MCPMetricsCollector()
    yield collector
    collector.reset_metrics()


class TestEnhancedMCPClient:
    """Test suite for EnhancedMCPClient."""
    
    async def test_client_initialization(self, enhanced_mcp_client):
        """Test client initializes correctly."""
        assert enhanced_mcp_client.connection_pool is not None
        assert enhanced_mcp_client.cache is not None
        assert enhanced_mcp_client.circuit_breakers is not None
        assert enhanced_mcp_client.metrics is not None
    
    async def test_server_registration(self, enhanced_mcp_client):
        """Test server registration."""
        await enhanced_mcp_client.register_server(
            server_name="test_server",
            endpoint="stdio://test",
            priority=1
        )
        
        assert "test_server" in enhanced_mcp_client.server_configs
        assert enhanced_mcp_client.server_configs["test_server"]["endpoint"] == "stdio://test"
        assert enhanced_mcp_client.server_configs["test_server"]["priority"] == 1
    
    @patch('app.service.agent.mcp_client.enhanced_mcp_client.EnhancedMCPClient._execute_mcp_call')
    async def test_tool_execution_with_caching(self, mock_execute, enhanced_mcp_client):
        """Test tool execution with caching."""
        # Register test server
        await enhanced_mcp_client.register_server(
            server_name="test_server",
            endpoint="stdio://test"
        )
        
        # Mock execution result
        mock_result = {"result": "test_data", "success": True}
        mock_execute.return_value = mock_result
        
        # Execute tool (should miss cache)
        result1 = await enhanced_mcp_client.execute_tool(
            server_name="test_server",
            tool_name="test_tool",
            params={"param1": "value1"},
            use_cache=True
        )
        
        # Execute same tool again (should hit cache)
        result2 = await enhanced_mcp_client.execute_tool(
            server_name="test_server",
            tool_name="test_tool",
            params={"param1": "value1"},
            use_cache=True
        )
        
        assert result1 == result2 == mock_result
        # Should only execute once due to caching
        mock_execute.assert_called_once()
    
    async def test_circuit_breaker_functionality(self, enhanced_mcp_client):
        """Test circuit breaker opens on failures."""
        await enhanced_mcp_client.register_server(
            server_name="test_server",
            endpoint="stdio://test"
        )
        
        # Mock failures
        with patch('app.service.agent.mcp_client.enhanced_mcp_client.EnhancedMCPClient._execute_mcp_call',
                  side_effect=Exception("Connection failed")):
            
            # Trigger multiple failures to open circuit breaker
            for _ in range(4):
                try:
                    await enhanced_mcp_client.execute_tool(
                        server_name="test_server",
                        tool_name="test_tool",
                        params={}
                    )
                except Exception:
                    pass
            
            # Circuit breaker should be open now
            cb = enhanced_mcp_client.circuit_breakers["test_server"]
            assert not cb.can_execute()
    
    async def test_retry_logic(self, enhanced_mcp_client):
        """Test retry logic on failures."""
        await enhanced_mcp_client.register_server(
            server_name="test_server",
            endpoint="stdio://test"
        )
        
        call_count = 0
        
        async def mock_execute_with_retries(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary failure")
            return {"result": "success", "success": True}
        
        with patch('app.service.agent.mcp_client.enhanced_mcp_client.EnhancedMCPClient._execute_mcp_call',
                  side_effect=mock_execute_with_retries):
            
            result = await enhanced_mcp_client.execute_tool(
                server_name="test_server",
                tool_name="test_tool",
                params={},
                retry_count=3
            )
            
            assert result["success"] is True
            assert call_count == 3


class TestMCPConnectionPool:
    """Test suite for MCPConnectionPool."""
    
    async def test_pool_initialization(self, connection_pool):
        """Test connection pool initializes correctly."""
        assert connection_pool.max_connections == 5
        assert connection_pool.min_connections == 1
        assert connection_pool.connections == {}
        assert connection_pool.server_configs == {}
    
    async def test_server_registration(self, connection_pool):
        """Test server registration in pool."""
        connection_pool.register_server(
            server_name="test_server",
            endpoint="stdio://test"
        )
        
        assert "test_server" in connection_pool.server_configs
        assert "test_server" in connection_pool.connections
        assert len(connection_pool.connections["test_server"]) == 0
    
    async def test_connection_acquisition_and_release(self, connection_pool):
        """Test connection acquisition and release."""
        connection_pool.register_server(
            server_name="test_server",
            endpoint="stdio://test"
        )
        
        with patch('app.service.agent.mcp_client.mcp_connection_pool.MCPConnectionPool._establish_mcp_connection',
                  return_value={"mock": "connection"}):
            
            async with connection_pool.get_connection("test_server") as conn:
                assert isinstance(conn, MCPConnection)
                assert conn.server_name == "test_server"
                assert conn.state == ConnectionState.HEALTHY
    
    async def test_connection_reuse(self, connection_pool):
        """Test connection reuse from pool."""
        connection_pool.register_server(
            server_name="test_server",
            endpoint="stdio://test"
        )
        
        with patch('app.service.agent.mcp_client.mcp_connection_pool.MCPConnectionPool._establish_mcp_connection',
                  return_value={"mock": "connection"}) as mock_establish:
            
            # First connection
            async with connection_pool.get_connection("test_server"):
                pass
            
            # Second connection should reuse existing one
            async with connection_pool.get_connection("test_server"):
                pass
            
            # Should have created connection only once
            assert mock_establish.call_count == 1
    
    async def test_pool_stats(self, connection_pool):
        """Test pool statistics collection."""
        connection_pool.register_server(
            server_name="test_server",
            endpoint="stdio://test"
        )
        
        with patch('app.service.agent.mcp_client.mcp_connection_pool.MCPConnectionPool._establish_mcp_connection',
                  return_value={"mock": "connection"}):
            
            async with connection_pool.get_connection("test_server"):
                stats = connection_pool.get_pool_stats()
                
                assert "servers" in stats
                assert "test_server" in stats["servers"]
                assert stats["total_connections"] >= 1
                assert stats["healthy_connections"] >= 1


class TestMCPHealthMonitor:
    """Test suite for MCPHealthMonitor."""
    
    async def test_monitor_initialization(self, health_monitor):
        """Test health monitor initializes correctly."""
        assert health_monitor.check_interval == 1.0
        assert health_monitor.server_health == {}
        assert health_monitor.failover_rules == {}
        assert health_monitor._running is True
    
    async def test_server_registration(self, health_monitor):
        """Test server registration for monitoring."""
        health_monitor.register_server(
            server_name="test_server",
            service_type="test_service",
            priority=1
        )
        
        assert "test_server" in health_monitor.server_health
        assert health_monitor.server_health["test_server"].server_name == "test_server"
        assert health_monitor.primary_servers["test_service"] == "test_server"
    
    async def test_health_check_execution(self, health_monitor):
        """Test health check execution."""
        health_monitor.register_server(
            server_name="test_server",
            service_type="test_service"
        )
        
        # Mock health check methods
        with patch.object(health_monitor, '_check_response_time', return_value=0.1), \
             patch.object(health_monitor, '_check_error_rate', return_value=0.05), \
             patch.object(health_monitor, '_check_memory_usage', return_value=0.6), \
             patch.object(health_monitor, '_check_connection_count', return_value=25):
            
            report = await health_monitor.check_server_health("test_server")
            
            assert report.server_name == "test_server"
            assert report.overall_status == HealthStatus.HEALTHY
            assert "response_time" in report.metrics
            assert "error_rate" in report.metrics
            assert "memory_usage" in report.metrics
            assert "connection_count" in report.metrics
    
    async def test_failover_trigger(self, health_monitor):
        """Test failover triggering on health issues."""
        # Register primary and backup servers
        health_monitor.register_server(
            server_name="primary_server",
            service_type="test_service",
            priority=2
        )
        health_monitor.register_server(
            server_name="backup_server",
            service_type="test_service",
            priority=1
        )
        
        # Mock unhealthy conditions
        with patch.object(health_monitor, '_check_response_time', return_value=10.0), \
             patch.object(health_monitor, '_check_error_rate', return_value=0.5), \
             patch.object(health_monitor, '_check_memory_usage', return_value=0.9), \
             patch.object(health_monitor, '_check_connection_count', return_value=200):
            
            # Trigger multiple failed health checks
            for _ in range(4):
                await health_monitor.check_server_health("primary_server")
            
            # Should have switched to backup
            assert health_monitor.get_primary_server("test_service") == "backup_server"
    
    async def test_health_summary(self, health_monitor):
        """Test health summary generation."""
        health_monitor.register_server(
            server_name="test_server",
            service_type="test_service"
        )
        
        summary = health_monitor.get_health_summary()
        
        assert "total_servers" in summary
        assert "healthy_servers" in summary
        assert "degraded_servers" in summary
        assert "unhealthy_servers" in summary
        assert "primary_servers" in summary
        assert "servers" in summary


class TestMCPMetricsCollector:
    """Test suite for MCPMetricsCollector."""
    
    def test_metrics_initialization(self, metrics_collector):
        """Test metrics collector initializes correctly."""
        assert metrics_collector.max_history_size == 1000
        assert len(metrics_collector.counters) == 0
        assert len(metrics_collector.gauges) == 0
    
    def test_counter_operations(self, metrics_collector):
        """Test counter operations."""
        # Increment counter
        metrics_collector.increment_counter("test_counter", 5.0)
        assert metrics_collector.get_counter_value("test_counter") == 5.0
        
        # Increment again
        metrics_collector.increment_counter("test_counter", 3.0)
        assert metrics_collector.get_counter_value("test_counter") == 8.0
        
        # With labels
        metrics_collector.increment_counter("test_counter", 2.0, {"server": "test"})
        assert metrics_collector.get_counter_value("test_counter", {"server": "test"}) == 2.0
    
    def test_gauge_operations(self, metrics_collector):
        """Test gauge operations."""
        metrics_collector.set_gauge("test_gauge", 42.0)
        assert metrics_collector.get_gauge_value("test_gauge") == 42.0
        
        # Update gauge
        metrics_collector.set_gauge("test_gauge", 84.0)
        assert metrics_collector.get_gauge_value("test_gauge") == 84.0
    
    def test_histogram_operations(self, metrics_collector):
        """Test histogram operations."""
        # Record values
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        for value in values:
            metrics_collector.record_histogram("test_histogram", value)
        
        stats = metrics_collector.get_histogram_stats("test_histogram")
        
        assert stats["count"] == 5
        assert stats["sum"] == 15.0
        assert stats["mean"] == 3.0
        assert stats["min"] == 1.0
        assert stats["max"] == 5.0
    
    def test_timer_operations(self, metrics_collector):
        """Test timer operations."""
        # Record timing measurements
        durations = [0.1, 0.2, 0.3, 0.4, 0.5]
        for duration in durations:
            metrics_collector.record_timer("test_timer", duration)
        
        stats = metrics_collector.get_timer_stats("test_timer")
        
        assert stats["count"] == 5
        assert stats["mean"] == 0.3
        assert stats["min"] == 0.1
        assert stats["max"] == 0.5
    
    def test_timer_context_manager(self, metrics_collector):
        """Test timer context manager."""
        with metrics_collector.timer("test_operation"):
            time.sleep(0.01)  # Short sleep
        
        stats = metrics_collector.get_timer_stats("test_operation")
        assert stats["count"] == 1
        assert stats["mean"] > 0.0
    
    def test_request_tracking(self, metrics_collector):
        """Test request tracking."""
        # Track successful request
        metrics_collector.track_request("server1", "tool_call", success=True, response_time=0.5)
        
        # Track failed request
        metrics_collector.track_request("server1", "tool_call", success=False, response_time=1.0)
        
        server_stats = metrics_collector.get_server_stats("server1")
        
        assert server_stats["total_requests"] == 2
        assert server_stats["error_count"] == 1
        assert server_stats["success_rate"] == 0.5
        assert server_stats["error_rate"] == 0.5
        assert server_stats["response_time_mean"] == 0.75
    
    def test_cache_tracking(self, metrics_collector):
        """Test cache operation tracking."""
        metrics_collector.track_cache_operation("get", hit=True)
        metrics_collector.track_cache_operation("get", hit=False)
        metrics_collector.track_cache_operation("set")
        
        # Check counters
        assert metrics_collector.get_counter_value("mcp_cache_operations", {"operation": "get", "result": "hit"}) == 1
        assert metrics_collector.get_counter_value("mcp_cache_operations", {"operation": "get", "result": "miss"}) == 1
        assert metrics_collector.get_counter_value("mcp_cache_operations", {"operation": "set", "result": "miss"}) == 1
    
    def test_circuit_breaker_tracking(self, metrics_collector):
        """Test circuit breaker tracking."""
        metrics_collector.track_circuit_breaker("server1", "open")
        metrics_collector.track_circuit_breaker("server1", "closed")
        
        # Check gauge for current state
        assert metrics_collector.get_gauge_value("mcp_circuit_breaker_state", {"server": "server1"}) == 0.0
        
        # Check counter for transitions
        assert metrics_collector.get_counter_value("mcp_circuit_breaker_transitions", {"server": "server1", "state": "open"}) == 1
        assert metrics_collector.get_counter_value("mcp_circuit_breaker_transitions", {"server": "server1", "state": "closed"}) == 1
    
    def test_prometheus_export(self, metrics_collector):
        """Test Prometheus format export."""
        metrics_collector.increment_counter("test_counter", 5.0)
        metrics_collector.set_gauge("test_gauge", 42.0)
        
        prometheus_output = metrics_collector.export_prometheus_format()
        
        assert "# TYPE test_counter counter" in prometheus_output
        assert "test_counter 5.0" in prometheus_output
        assert "# TYPE test_gauge gauge" in prometheus_output
        assert "test_gauge 42.0" in prometheus_output
    
    def test_all_metrics_export(self, metrics_collector):
        """Test comprehensive metrics export."""
        # Add some test data
        metrics_collector.increment_counter("test_counter", 1.0)
        metrics_collector.set_gauge("test_gauge", 2.0)
        metrics_collector.record_histogram("test_histogram", 3.0)
        metrics_collector.record_timer("test_timer", 0.1)
        metrics_collector.track_request("server1", "test", success=True, response_time=0.2)
        
        all_metrics = metrics_collector.get_all_metrics()
        
        assert "counters" in all_metrics
        assert "gauges" in all_metrics
        assert "histograms" in all_metrics
        assert "timers" in all_metrics
        assert "server_stats" in all_metrics
        assert "timestamp" in all_metrics
        
        assert all_metrics["counters"]["test_counter"] == 1.0
        assert all_metrics["gauges"]["test_gauge"] == 2.0
        assert "server1" in all_metrics["server_stats"]


class TestIntegration:
    """Integration tests for all MCP infrastructure components."""
    
    @pytest.fixture
    async def full_infrastructure(self):
        """Set up complete MCP infrastructure for integration testing."""
        with patch('redis.Redis'):
            # Initialize all components
            client = EnhancedMCPClient()
            await client.initialize()
            
            # Register test server
            await client.register_server(
                server_name="integration_test_server",
                endpoint="stdio://test",
                priority=1
            )
            
            yield client
            await client.shutdown()
    
    async def test_end_to_end_tool_execution(self, full_infrastructure):
        """Test complete end-to-end tool execution flow."""
        client = full_infrastructure
        
        # Mock the actual MCP execution
        mock_result = {"result": "integration_test_success", "success": True}
        
        with patch('app.service.agent.mcp_client.enhanced_mcp_client.EnhancedMCPClient._execute_mcp_call',
                  return_value=mock_result):
            
            result = await client.execute_tool(
                server_name="integration_test_server",
                tool_name="integration_test_tool",
                params={"test_param": "test_value"},
                use_cache=True,
                retry_count=3
            )
            
            assert result == mock_result
            
            # Verify metrics were collected
            metrics = client.metrics.get_all_metrics()
            assert metrics["server_stats"]["integration_test_server"]["total_requests"] >= 1
            
            # Verify caching worked
            cached_result = await client.execute_tool(
                server_name="integration_test_server",
                tool_name="integration_test_tool",
                params={"test_param": "test_value"},
                use_cache=True
            )
            
            assert cached_result == mock_result
    
    async def test_infrastructure_monitoring_integration(self, full_infrastructure):
        """Test monitoring integration across all components."""
        client = full_infrastructure
        
        # Execute some operations to generate metrics
        with patch('app.service.agent.mcp_client.enhanced_mcp_client.EnhancedMCPClient._execute_mcp_call',
                  return_value={"success": True}):
            
            # Execute multiple operations
            for i in range(5):
                await client.execute_tool(
                    server_name="integration_test_server",
                    tool_name=f"test_tool_{i}",
                    params={"iteration": i}
                )
        
        # Check that all monitoring systems recorded the activity
        metrics = client.metrics.get_all_metrics()
        pool_stats = client.connection_pool.get_pool_stats()
        health_summary = client.health_monitor.get_health_summary()
        
        # Verify metrics
        assert "integration_test_server" in metrics["server_stats"]
        server_stats = metrics["server_stats"]["integration_test_server"]
        assert server_stats["total_requests"] == 5
        assert server_stats["success_rate"] == 1.0
        
        # Verify connection pool
        assert "integration_test_server" in pool_stats["servers"]
        
        # Verify health monitoring
        assert "integration_test_server" in health_summary["servers"]


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])