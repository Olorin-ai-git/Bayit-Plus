"""
Unit tests for MCP Monitoring and Observability System
"""

import asyncio
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
import time

from app.service.mcp_servers.monitoring import (
    MCPMonitor,
    HealthStatus,
    AlertSeverity,
    ServerMetrics,
    HealthCheck,
    Alert,
    monitor_operation,
    MCPMonitoringIntegration,
    setup_mcp_monitoring
)


class TestMCPMonitor:
    """Test cases for MCPMonitor class."""
    
    @pytest.fixture
    def monitor(self):
        """Create a monitor instance for testing."""
        return MCPMonitor(
            check_interval=1,
            metrics_window=3600,
            alert_cooldown=5,
            enable_prometheus=True
        )
    
    @pytest.mark.asyncio
    async def test_monitor_initialization(self, monitor):
        """Test monitor initialization."""
        assert monitor.check_interval == 1
        assert monitor.metrics_window == 3600
        assert monitor.alert_cooldown == 5
        assert monitor.enable_prometheus is True
        assert len(monitor.servers) == 0
        assert len(monitor.active_alerts) == 0
    
    @pytest.mark.asyncio
    async def test_start_monitoring(self, monitor):
        """Test starting monitoring for servers."""
        servers = ["fraud_database", "external_api", "graph_analysis"]
        
        await monitor.start_monitoring(servers)
        
        # Check servers are initialized
        assert len(monitor.servers) == 3
        for server in servers:
            assert server in monitor.servers
            assert isinstance(monitor.servers[server], ServerMetrics)
        
        # Check monitoring tasks are created
        assert len(monitor._monitoring_tasks) == 4
        
        # Cleanup
        await monitor.stop_monitoring()
    
    @pytest.mark.asyncio
    async def test_record_request_success(self, monitor):
        """Test recording a successful request."""
        await monitor.record_request(
            server_name="test_server",
            operation="test_operation",
            success=True,
            response_time_ms=100.5
        )
        
        # Check metrics updated
        assert "test_server" in monitor.servers
        metrics = monitor.servers["test_server"]
        assert metrics.total_requests == 1
        assert metrics.success_count == 1
        assert metrics.error_count == 0
        assert len(metrics.response_times) == 1
        assert metrics.response_times[0] == 100.5
    
    @pytest.mark.asyncio
    async def test_record_request_failure(self, monitor):
        """Test recording a failed request."""
        await monitor.record_request(
            server_name="test_server",
            operation="test_operation",
            success=False,
            response_time_ms=50.0,
            error="Connection timeout"
        )
        
        # Check metrics updated
        metrics = monitor.servers["test_server"]
        assert metrics.total_requests == 1
        assert metrics.success_count == 0
        assert metrics.error_count == 1
        assert metrics.last_error == "Connection timeout"
        assert metrics.last_error_time is not None
    
    @pytest.mark.asyncio
    async def test_health_check(self, monitor):
        """Test health check functionality."""
        # Setup server
        await monitor.start_monitoring(["test_server"])
        
        # Perform health check
        health_check = await monitor._check_server_health("test_server")
        
        assert health_check.server_name == "test_server"
        assert health_check.status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED]
        assert health_check.response_time_ms >= 0
        assert "connectivity" in health_check.checks_passed
        
        # Cleanup
        await monitor.stop_monitoring()
    
    @pytest.mark.asyncio
    async def test_alert_creation(self, monitor):
        """Test alert creation with cooldown."""
        await monitor._create_alert(
            server_name="test_server",
            severity=AlertSeverity.WARNING,
            title="High Response Time",
            description="Response time exceeds threshold"
        )
        
        # Check alert created
        assert len(monitor.active_alerts) == 1
        alert = list(monitor.active_alerts.values())[0]
        assert alert.server_name == "test_server"
        assert alert.severity == AlertSeverity.WARNING
        assert alert.title == "High Response Time"
        assert not alert.resolved
        
        # Check cooldown prevents duplicate
        await monitor._create_alert(
            server_name="test_server",
            severity=AlertSeverity.WARNING,
            title="High Response Time",
            description="Response time exceeds threshold"
        )
        
        assert len(monitor.active_alerts) == 1  # No new alert created
    
    @pytest.mark.asyncio
    async def test_alert_resolution(self, monitor):
        """Test alert resolution."""
        # Create alert
        await monitor._create_alert(
            server_name="test_server",
            severity=AlertSeverity.ERROR,
            title="Server Down",
            description="Server is not responding"
        )
        
        alert_id = list(monitor.active_alerts.keys())[0]
        
        # Resolve alert
        await monitor.resolve_alert(alert_id)
        
        alert = monitor.active_alerts[alert_id]
        assert alert.resolved is True
        assert alert.resolved_at is not None
    
    @pytest.mark.asyncio
    async def test_metrics_aggregation(self, monitor):
        """Test metrics aggregation."""
        # Record multiple requests
        for i in range(10):
            await monitor.record_request(
                server_name="test_server",
                operation="test",
                success=i < 8,  # 80% success rate
                response_time_ms=100 + i * 10
            )
        
        metrics = monitor.servers["test_server"]
        
        # Aggregate metrics
        await monitor._aggregate_metrics(metrics)
        
        # Check aggregated values
        assert metrics.avg_response_time > 0
        assert metrics.p95_response_time > metrics.avg_response_time
        assert metrics.p99_response_time >= metrics.p95_response_time
        assert metrics.success_rate == 80.0
        assert metrics.error_rate == 20.0
    
    @pytest.mark.asyncio
    async def test_sla_report_generation(self, monitor):
        """Test SLA report generation."""
        # Setup servers with metrics
        await monitor.start_monitoring(["server1", "server2"])
        
        # Record some metrics
        for server in ["server1", "server2"]:
            for i in range(5):
                await monitor.record_request(
                    server_name=server,
                    operation="test",
                    success=True,
                    response_time_ms=50
                )
        
        # Generate report
        report = await monitor._generate_sla_report()
        
        assert "timestamp" in report
        assert "servers" in report
        assert "overall" in report
        assert "server1" in report["servers"]
        assert "server2" in report["servers"]
        
        # Cleanup
        await monitor.stop_monitoring()
    
    @pytest.mark.asyncio
    async def test_monitor_operation_context_manager(self, monitor):
        """Test the monitor_operation context manager."""
        # Successful operation
        async with monitor_operation(monitor, "test_server", "test_op"):
            await asyncio.sleep(0.01)  # Simulate operation
        
        metrics = monitor.servers["test_server"]
        assert metrics.total_requests == 1
        assert metrics.success_count == 1
        
        # Failed operation
        with pytest.raises(ValueError):
            async with monitor_operation(monitor, "test_server", "failing_op"):
                raise ValueError("Test error")
        
        assert metrics.total_requests == 2
        assert metrics.error_count == 1
    
    @pytest.mark.asyncio
    async def test_prometheus_metrics_export(self, monitor):
        """Test Prometheus metrics export."""
        # Record some metrics
        await monitor.record_request(
            server_name="test_server",
            operation="test",
            success=True,
            response_time_ms=100
        )
        
        # Export metrics
        prometheus_data = monitor.export_prometheus_metrics()
        
        assert isinstance(prometheus_data, bytes)
        assert len(prometheus_data) > 0
        
        # Check for expected metric names in output
        data_str = prometheus_data.decode('utf-8')
        assert "mcp_requests_total" in data_str
        assert "mcp_request_duration_seconds" in data_str


class TestMCPMonitoringIntegration:
    """Test cases for MCPMonitoringIntegration."""
    
    @pytest.fixture
    def integration(self):
        """Create integration instance for testing."""
        monitor = Mock(spec=MCPMonitor)
        coordinator = Mock()
        registry = Mock()
        security_manager = Mock()
        
        return MCPMonitoringIntegration(
            monitor=monitor,
            coordinator=coordinator,
            registry=registry,
            security_manager=security_manager
        )
    
    @pytest.mark.asyncio
    async def test_integration_initialization(self, integration):
        """Test integration initialization."""
        integration.monitor.start_monitoring = AsyncMock()
        integration.registry.servers = {"server1": {}, "server2": {}}
        
        await integration.initialize()
        
        # Check monitoring started
        integration.monitor.start_monitoring.assert_called_once()
        
        # Check hooks registered
        assert integration._hooks_registered is True
    
    @pytest.mark.asyncio
    async def test_monitor_investigation(self, integration):
        """Test investigation monitoring."""
        integration.monitor.record_request = AsyncMock()
        
        # Create investigation monitor
        track_task = await integration.monitor_investigation("inv_123")
        
        # Track a task
        await track_task({
            "server": "test_server",
            "type": "analysis",
            "success": True,
            "duration": 1.5
        })
        
        # Check metrics recorded
        integration.monitor.record_request.assert_called_once_with(
            server_name="test_server",
            operation="investigation_analysis",
            success=True,
            response_time_ms=1500
        )
    
    @pytest.mark.asyncio
    async def test_performance_report_generation(self, integration):
        """Test performance report generation."""
        # Setup mock data
        integration.monitor.servers = {
            "server1": Mock(
                total_requests=100,
                success_rate=99.0,
                error_rate=1.0,
                avg_response_time=50,
                p95_response_time=100,
                p99_response_time=150
            )
        }
        integration.monitor.alert_history = []
        integration.monitor._generate_sla_report = AsyncMock(
            return_value={"overall": {"availability": 99.9}}
        )
        
        # Generate report
        report = await integration.generate_performance_report(24)
        
        assert "generated_at" in report
        assert "servers" in report
        assert "server1" in report["servers"]
        assert report["servers"]["server1"]["success_rate"] == 99.0
        assert "sla_compliance" in report
    
    @pytest.mark.asyncio
    async def test_grafana_export(self, integration):
        """Test Grafana metrics export."""
        # Setup mock data
        integration.monitor.servers = {
            "server1": Mock(
                avg_response_time=50,
                p95_response_time=100,
                p99_response_time=150,
                success_rate=99.0,
                error_rate=1.0,
                memory_usage_mb=512,
                cpu_usage_percent=25
            )
        }
        
        # Export metrics
        grafana_metrics = await integration.export_metrics_for_grafana()
        
        assert isinstance(grafana_metrics, list)
        assert len(grafana_metrics) > 0
        
        # Check metric format
        metric = grafana_metrics[0]
        assert "target" in metric
        assert "datapoints" in metric
        assert isinstance(metric["datapoints"], list)
    
    @pytest.mark.asyncio
    async def test_monitoring_middleware(self, integration):
        """Test FastAPI monitoring middleware."""
        integration.monitor.record_request = AsyncMock()
        
        # Create mock request
        request = Mock()
        request.url.path = "/mcp/fraud_database/query"
        request.method = "POST"
        
        # Create mock call_next
        async def call_next(req):
            response = Mock()
            response.status_code = 200
            return response
        
        # Get middleware
        middleware = integration.create_monitoring_middleware()
        
        # Execute middleware
        response = await middleware(request, call_next)
        
        # Check metrics recorded
        integration.monitor.record_request.assert_called_once()
        call_args = integration.monitor.record_request.call_args[1]
        assert call_args["server_name"] == "fraud_database"
        assert call_args["success"] is True
    
    @pytest.mark.asyncio
    async def test_cleanup(self, integration):
        """Test integration cleanup."""
        integration.monitor.stop_monitoring = AsyncMock()
        integration._hooks_registered = True
        integration._original_methods = {"test_method": Mock()}
        
        await integration.cleanup()
        
        # Check monitoring stopped
        integration.monitor.stop_monitoring.assert_called_once()


class TestMonitoringSetup:
    """Test monitoring setup and configuration."""
    
    @pytest.mark.asyncio
    async def test_setup_mcp_monitoring(self):
        """Test complete monitoring setup."""
        with patch('app.service.mcp_servers.monitoring.integration.MCPMonitoringIntegration') as MockIntegration:
            mock_integration = Mock()
            mock_integration.initialize = AsyncMock()
            MockIntegration.return_value = mock_integration
            
            # Setup monitoring
            integration = await setup_mcp_monitoring()
            
            # Check integration created and initialized
            assert integration == mock_integration
            mock_integration.initialize.assert_called_once()
    
    def test_monitor_singleton(self):
        """Test monitor singleton pattern."""
        from app.service.mcp_servers.monitoring import get_mcp_monitor
        
        monitor1 = get_mcp_monitor()
        monitor2 = get_mcp_monitor()
        
        assert monitor1 is monitor2
    
    def test_integration_singleton(self):
        """Test integration singleton pattern."""
        from app.service.mcp_servers.monitoring import get_monitoring_integration
        
        integration1 = get_monitoring_integration()
        integration2 = get_monitoring_integration()
        
        assert integration1 is integration2


@pytest.mark.asyncio
async def test_end_to_end_monitoring():
    """End-to-end test of monitoring system."""
    # Create monitor
    monitor = MCPMonitor(
        check_interval=1,
        alert_cooldown=1,
        enable_prometheus=True
    )
    
    # Start monitoring
    servers = ["test_server_1", "test_server_2"]
    await monitor.start_monitoring(servers)
    
    try:
        # Simulate some requests
        for i in range(10):
            server = servers[i % 2]
            await monitor.record_request(
                server_name=server,
                operation="test_operation",
                success=i < 8,  # 80% success rate
                response_time_ms=50 + i * 10
            )
        
        # Wait for aggregation
        await asyncio.sleep(0.1)
        
        # Check metrics
        summary = monitor.get_metrics_summary()
        assert "servers" in summary
        assert "test_server_1" in summary["servers"]
        assert "test_server_2" in summary["servers"]
        
        # Check health status
        status1 = monitor.get_server_status("test_server_1")
        status2 = monitor.get_server_status("test_server_2")
        assert status1 in [HealthStatus.HEALTHY, HealthStatus.DEGRADED, HealthStatus.UNKNOWN]
        assert status2 in [HealthStatus.HEALTHY, HealthStatus.DEGRADED, HealthStatus.UNKNOWN]
        
        # Check Prometheus export
        prometheus_data = monitor.export_prometheus_metrics()
        assert len(prometheus_data) > 0
        
    finally:
        # Cleanup
        await monitor.stop_monitoring()