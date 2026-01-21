"""
MCP Monitoring and Observability System

Enterprise-grade monitoring, metrics collection, alerting, and
observability for MCP servers in the Olorin fraud detection platform.
"""

from .dashboard import MCPDashboard, create_dashboard_app
from .integration import (
    MCPMonitoringIntegration,
    get_monitoring_integration,
    setup_mcp_monitoring,
)
from .mcp_monitor import (
    Alert,
    AlertSeverity,
    HealthCheck,
    HealthStatus,
    MCPMonitor,
    MetricType,
    ServerMetrics,
    get_mcp_monitor,
    monitor_operation,
)

__all__ = [
    # Monitor
    "MCPMonitor",
    "HealthStatus",
    "MetricType",
    "AlertSeverity",
    "ServerMetrics",
    "HealthCheck",
    "Alert",
    "get_mcp_monitor",
    "monitor_operation",
    # Dashboard
    "MCPDashboard",
    "create_dashboard_app",
    # Integration
    "MCPMonitoringIntegration",
    "get_monitoring_integration",
    "setup_mcp_monitoring",
]

__version__ = "1.0.0"
