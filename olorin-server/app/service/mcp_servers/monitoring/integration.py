"""
MCP Monitoring Integration

Integrates the monitoring system with existing MCP infrastructure,
coordinators, and the Olorin platform.
"""

import asyncio
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
import functools
import time

from ...agent.orchestration.mcp_coordinator import MCPCoordinator, get_mcp_coordinator
from ...agent.orchestration.mcp_server_registry import MCPServerRegistry
from ..security.mcp_auth import MCPSecurityManager
from .mcp_monitor import MCPMonitor, get_mcp_monitor, monitor_operation
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MCPMonitoringIntegration:
    """
    Integration layer between MCP monitoring and the Olorin platform.
    
    Provides seamless monitoring integration with:
    - MCP Coordinator
    - Server Registry
    - Security Framework
    - Investigation workflows
    """
    
    def __init__(
        self,
        monitor: Optional[MCPMonitor] = None,
        coordinator: Optional[MCPCoordinator] = None,
        registry: Optional[MCPServerRegistry] = None,
        security_manager: Optional[MCPSecurityManager] = None
    ):
        """
        Initialize the monitoring integration.
        
        Args:
            monitor: MCP monitor instance
            coordinator: MCP coordinator instance
            registry: Server registry instance
            security_manager: Security manager instance
        """
        self.monitor = monitor or get_mcp_monitor()
        self.coordinator = coordinator or get_mcp_coordinator()
        self.registry = registry
        self.security_manager = security_manager
        
        # Hook registration
        self._hooks_registered = False
        self._original_methods = {}
    
    async def initialize(self):
        """Initialize monitoring integration."""
        logger.info("Initializing MCP monitoring integration")
        
        # Get list of servers from registry
        if self.registry:
            servers = list(self.registry.servers.keys())
        else:
            # Default servers if no registry
            servers = ["fraud_database", "external_api", "graph_analysis"]
        
        # Start monitoring
        await self.monitor.start_monitoring(servers)
        
        # Register hooks
        self._register_hooks()
        
        # Setup security monitoring if available
        if self.security_manager:
            await self._setup_security_monitoring()
        
        logger.info("MCP monitoring integration initialized successfully")
    
    def _register_hooks(self):
        """Register monitoring hooks into MCP components."""
        if self._hooks_registered:
            return
        
        # Hook into coordinator routing decisions
        if self.coordinator:
            self._wrap_coordinator_methods()
        
        # Hook into registry operations
        if self.registry:
            self._wrap_registry_methods()
        
        self._hooks_registered = True
        logger.info("Monitoring hooks registered")
    
    def _wrap_coordinator_methods(self):
        """Wrap coordinator methods with monitoring."""
        original_coordinate = self.coordinator.coordinate_investigation
        
        @functools.wraps(original_coordinate)
        async def monitored_coordinate(*args, **kwargs):
            """Monitored version of coordinate_investigation."""
            start_time = time.time()
            server_name = "mcp_coordinator"
            
            try:
                # Call original method
                result = await original_coordinate(*args, **kwargs)
                
                # Record success
                await self.monitor.record_request(
                    server_name=server_name,
                    operation="coordinate_investigation",
                    success=True,
                    response_time_ms=(time.time() - start_time) * 1000
                )
                
                # Monitor individual routing decisions
                for decision in result:
                    if decision.selected_server:
                        await self.monitor.record_request(
                            server_name=decision.selected_server,
                            operation=f"route_{decision.task_type}",
                            success=True,
                            response_time_ms=0  # Routing decision time
                        )
                
                return result
                
            except Exception as e:
                # Record failure
                await self.monitor.record_request(
                    server_name=server_name,
                    operation="coordinate_investigation",
                    success=False,
                    response_time_ms=(time.time() - start_time) * 1000,
                    error=str(e)
                )
                raise
        
        self.coordinator.coordinate_investigation = monitored_coordinate
        self._original_methods['coordinate_investigation'] = original_coordinate
    
    def _wrap_registry_methods(self):
        """Wrap registry methods with monitoring."""
        if not hasattr(self.registry, 'call_tool'):
            return
        
        original_call = self.registry.call_tool
        
        @functools.wraps(original_call)
        async def monitored_call(server_name: str, tool_name: str, *args, **kwargs):
            """Monitored version of call_tool."""
            async with monitor_operation(
                self.monitor,
                server_name,
                f"tool_{tool_name}"
            ):
                return await original_call(server_name, tool_name, *args, **kwargs)
        
        self.registry.call_tool = monitored_call
        self._original_methods['call_tool'] = original_call
    
    async def _setup_security_monitoring(self):
        """Setup monitoring for security events."""
        
        async def on_auth_failure(event: Dict[str, Any]):
            """Handle authentication failure events."""
            await self.monitor._create_alert(
                server_name=event.get('server', 'unknown'),
                severity=AlertSeverity.ERROR,
                title="Authentication Failure",
                description=f"Authentication failed: {event.get('reason', 'Unknown')}",
                metadata=event
            )
        
        async def on_rate_limit(event: Dict[str, Any]):
            """Handle rate limit events."""
            await self.monitor._create_alert(
                server_name=event.get('server', 'unknown'),
                severity=AlertSeverity.WARNING,
                title="Rate Limit Exceeded",
                description=f"Rate limit exceeded for {event.get('client', 'unknown')}",
                metadata=event
            )
        
        # Register security event handlers
        if hasattr(self.security_manager, 'on_auth_failure'):
            self.security_manager.on_auth_failure = on_auth_failure
        
        if hasattr(self.security_manager, 'on_rate_limit'):
            self.security_manager.on_rate_limit = on_rate_limit
    
    async def monitor_investigation(
        self,
        investigation_id: str,
        callback: Optional[Callable] = None
    ):
        """
        Monitor a specific investigation.
        
        Args:
            investigation_id: ID of the investigation to monitor
            callback: Optional callback for investigation events
        """
        logger.info(f"Starting monitoring for investigation {investigation_id}")
        
        # Track investigation metrics
        investigation_metrics = {
            "id": investigation_id,
            "start_time": datetime.now(),
            "tasks_completed": 0,
            "tasks_failed": 0,
            "total_duration": 0
        }
        
        async def track_task(task_info: Dict[str, Any]):
            """Track individual task execution."""
            server_name = task_info.get("server", "unknown")
            task_type = task_info.get("type", "unknown")
            success = task_info.get("success", False)
            duration = task_info.get("duration", 0)
            
            # Update metrics
            if success:
                investigation_metrics["tasks_completed"] += 1
            else:
                investigation_metrics["tasks_failed"] += 1
            
            # Record in monitor
            await self.monitor.record_request(
                server_name=server_name,
                operation=f"investigation_{task_type}",
                success=success,
                response_time_ms=duration * 1000
            )
            
            # Call user callback if provided
            if callback:
                await callback(task_info)
        
        return track_task
    
    def create_monitoring_middleware(self):
        """
        Create FastAPI middleware for monitoring HTTP requests.
        
        Returns:
            Middleware function for FastAPI
        """
        async def monitoring_middleware(request, call_next):
            """Monitor HTTP requests to MCP endpoints."""
            start_time = time.time()
            
            # Extract server from path
            path_parts = request.url.path.split('/')
            server_name = "http_api"
            if len(path_parts) > 2 and path_parts[1] == "mcp":
                server_name = path_parts[2]
            
            try:
                # Process request
                response = await call_next(request)
                
                # Record metrics
                await self.monitor.record_request(
                    server_name=server_name,
                    operation=f"{request.method}_{request.url.path}",
                    success=response.status_code < 400,
                    response_time_ms=(time.time() - start_time) * 1000
                )
                
                return response
                
            except Exception as e:
                # Record error
                await self.monitor.record_request(
                    server_name=server_name,
                    operation=f"{request.method}_{request.url.path}",
                    success=False,
                    response_time_ms=(time.time() - start_time) * 1000,
                    error=str(e)
                )
                raise
        
        return monitoring_middleware
    
    async def get_investigation_metrics(
        self,
        investigation_id: str
    ) -> Dict[str, Any]:
        """
        Get metrics for a specific investigation.
        
        Args:
            investigation_id: Investigation ID
            
        Returns:
            Investigation metrics
        """
        # This would integrate with investigation tracking
        # For now, return sample metrics
        return {
            "investigation_id": investigation_id,
            "metrics": {
                "total_tasks": 0,
                "completed_tasks": 0,
                "failed_tasks": 0,
                "avg_task_time": 0,
                "total_duration": 0
            }
        }
    
    async def generate_performance_report(
        self,
        time_window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive performance report.
        
        Args:
            time_window_hours: Hours to include in report
            
        Returns:
            Performance report
        """
        report = {
            "generated_at": datetime.now().isoformat(),
            "time_window_hours": time_window_hours,
            "servers": {},
            "investigations": {
                "total": 0,
                "successful": 0,
                "failed": 0,
                "avg_duration": 0
            },
            "alerts": {
                "total": len(self.monitor.alert_history),
                "by_severity": {}
            },
            "sla_compliance": await self.monitor._generate_sla_report()
        }
        
        # Add server metrics
        for server_name, metrics in self.monitor.servers.items():
            report["servers"][server_name] = {
                "total_requests": metrics.total_requests,
                "success_rate": metrics.success_rate,
                "error_rate": metrics.error_rate,
                "avg_response_time": metrics.avg_response_time,
                "p95_response_time": metrics.p95_response_time,
                "p99_response_time": metrics.p99_response_time
            }
        
        # Count alerts by severity
        from collections import defaultdict
        severity_counts = defaultdict(int)
        for alert in self.monitor.alert_history:
            severity_counts[alert.severity.value] += 1
        report["alerts"]["by_severity"] = dict(severity_counts)
        
        return report
    
    async def export_metrics_for_grafana(self) -> Dict[str, Any]:
        """
        Export metrics in Grafana-compatible format.
        
        Returns:
            Metrics in Grafana format
        """
        grafana_metrics = []
        timestamp = int(datetime.now().timestamp() * 1000)
        
        for server_name, metrics in self.monitor.servers.items():
            # Response time metrics
            grafana_metrics.append({
                "target": f"{server_name}.response_time.avg",
                "datapoints": [[metrics.avg_response_time, timestamp]]
            })
            
            grafana_metrics.append({
                "target": f"{server_name}.response_time.p95",
                "datapoints": [[metrics.p95_response_time, timestamp]]
            })
            
            grafana_metrics.append({
                "target": f"{server_name}.response_time.p99",
                "datapoints": [[metrics.p99_response_time, timestamp]]
            })
            
            # Success/Error rates
            grafana_metrics.append({
                "target": f"{server_name}.success_rate",
                "datapoints": [[metrics.success_rate, timestamp]]
            })
            
            grafana_metrics.append({
                "target": f"{server_name}.error_rate",
                "datapoints": [[metrics.error_rate, timestamp]]
            })
            
            # Resource metrics
            grafana_metrics.append({
                "target": f"{server_name}.memory_mb",
                "datapoints": [[metrics.memory_usage_mb, timestamp]]
            })
            
            grafana_metrics.append({
                "target": f"{server_name}.cpu_percent",
                "datapoints": [[metrics.cpu_usage_percent, timestamp]]
            })
        
        return grafana_metrics
    
    async def cleanup(self):
        """Cleanup monitoring integration."""
        logger.info("Cleaning up MCP monitoring integration")
        
        # Restore original methods
        if self.coordinator and 'coordinate_investigation' in self._original_methods:
            self.coordinator.coordinate_investigation = self._original_methods['coordinate_investigation']
        
        if self.registry and 'call_tool' in self._original_methods:
            self.registry.call_tool = self._original_methods['call_tool']
        
        # Stop monitoring
        await self.monitor.stop_monitoring()
        
        logger.info("MCP monitoring integration cleaned up")


# Global integration instance
_integration: Optional[MCPMonitoringIntegration] = None


def get_monitoring_integration() -> MCPMonitoringIntegration:
    """Get the global monitoring integration instance."""
    global _integration
    if _integration is None:
        _integration = MCPMonitoringIntegration()
    return _integration


async def setup_mcp_monitoring(
    coordinator: Optional[MCPCoordinator] = None,
    registry: Optional[MCPServerRegistry] = None,
    security_manager: Optional[MCPSecurityManager] = None
) -> MCPMonitoringIntegration:
    """
    Setup MCP monitoring with all components.
    
    Args:
        coordinator: MCP coordinator instance
        registry: Server registry instance
        security_manager: Security manager instance
        
    Returns:
        Configured monitoring integration
    """
    integration = MCPMonitoringIntegration(
        coordinator=coordinator,
        registry=registry,
        security_manager=security_manager
    )
    
    await integration.initialize()
    
    # Set as global instance
    global _integration
    _integration = integration
    
    return integration