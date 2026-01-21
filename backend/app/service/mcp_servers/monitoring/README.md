# MCP Monitoring and Observability System

## Overview

The MCP Monitoring and Observability System provides enterprise-grade monitoring, metrics collection, alerting, and comprehensive observability for MCP (Model Context Protocol) servers in the Olorin fraud detection platform.

## Features

### Real-Time Health Monitoring
- Continuous health checks for all MCP servers
- Multi-point health validation (connectivity, response time, resources, error rate)
- Automatic status classification (Healthy, Degraded, Unhealthy, Critical)
- Historical health tracking with configurable retention

### Performance Metrics Collection
- Response time tracking (average, P95, P99)
- Success/error rate calculation
- Throughput measurement
- Resource utilization monitoring (CPU, memory, connections)
- Request volume tracking

### Automated Alerting
- Severity-based alerts (Info, Warning, Error, Critical)
- Alert cooldown to prevent spam
- Configurable thresholds
- Integration with enterprise alerting systems
- Alert resolution tracking

### SLA Tracking
- 99.99% uptime target monitoring
- Sub-second response time tracking
- Error rate compliance
- Automated SLA report generation
- Per-server and overall compliance metrics

### Integration Features
- Seamless integration with MCP Coordinator
- Server Registry monitoring hooks
- Security framework integration
- Investigation workflow tracking
- FastAPI middleware for HTTP monitoring

### Observability Dashboard
- Real-time web dashboard
- WebSocket-based live updates
- Interactive charts and visualizations
- Alert management interface
- Prometheus metrics export
- Grafana integration support

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  MCP Monitor                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │   Health   │  │  Metrics   │  │   Alerts   │   │
│  │  Checker   │  │ Aggregator │  │  Manager   │   │
│  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              Monitoring Integration                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │Coordinator │  │  Registry  │  │  Security  │   │
│  │   Hooks    │  │   Hooks    │  │   Hooks    │   │
│  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                    Dashboard                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │    Web     │  │ WebSocket  │  │    API     │   │
│  │ Interface  │  │  Updates   │  │ Endpoints  │   │
│  └────────────┘  └────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Basic Usage

```python
from app.service.mcp_servers.monitoring import (
    MCPMonitor,
    monitor_operation,
    get_mcp_monitor
)

# Get the global monitor instance
monitor = get_mcp_monitor()

# Start monitoring servers
await monitor.start_monitoring([
    "fraud_database",
    "external_api",
    "graph_analysis"
])

# Monitor an operation
async with monitor_operation(monitor, "fraud_database", "query"):
    result = await perform_database_query()

# Get metrics summary
summary = monitor.get_metrics_summary()
print(f"Success rate: {summary['servers']['fraud_database']['success_rate']:.1f}%")
```

### Integrated Setup

```python
from app.service.mcp_servers.monitoring import setup_mcp_monitoring

# Setup with all components
integration = await setup_mcp_monitoring(
    coordinator=mcp_coordinator,
    registry=server_registry,
    security_manager=security_manager
)

# Monitor an investigation
track_task = await integration.monitor_investigation("inv_123")
await track_task({
    "server": "fraud_database",
    "type": "analysis",
    "success": True,
    "duration": 1.5
})
```

### Dashboard Server

```python
from app.service.mcp_servers.monitoring import create_dashboard_app

# Create and run dashboard
app = create_dashboard_app()

# Access at:
# - Dashboard: http://localhost:8090/
# - API: http://localhost:8090/api/metrics
# - Prometheus: http://localhost:8090/metrics
```

## Configuration

### Monitor Configuration

```python
monitor = MCPMonitor(
    check_interval=30,        # Health check interval (seconds)
    metrics_window=3600,      # Metrics retention (seconds)
    alert_cooldown=300,       # Alert cooldown (seconds)
    enable_prometheus=True    # Enable Prometheus export
)
```

### SLA Targets

```python
monitor.sla_targets = {
    "availability": 99.99,      # % uptime
    "response_time_p95": 1000,  # milliseconds
    "response_time_p99": 2000,  # milliseconds
    "error_rate": 0.1          # % errors
}
```

## API Endpoints

### Health & Status
- `GET /health` - Overall system health
- `GET /api/health` - Detailed health status
- `GET /api/metrics` - Current metrics for all servers
- `GET /api/metrics/{server_name}` - Detailed server metrics

### Alerts
- `GET /api/alerts` - Active alerts
- `POST /api/alerts/{alert_id}/resolve` - Resolve an alert

### Reports
- `GET /api/sla` - SLA compliance report
- `GET /api/history/{server_name}` - Historical data

### Monitoring
- `GET /metrics` - Prometheus metrics export
- `WS /ws` - WebSocket for real-time updates

## Metrics

### Prometheus Metrics

- `mcp_requests_total` - Total requests by server and status
- `mcp_request_duration_seconds` - Request duration histogram
- `mcp_health_status` - Current health status (1=healthy, 0=unhealthy)
- `mcp_active_alerts` - Number of active alerts by severity
- `mcp_success_rate` - Current success rate percentage

### Key Performance Indicators

- **Availability**: Percentage of successful health checks
- **Response Time**: P50, P95, P99 percentiles
- **Error Rate**: Percentage of failed requests
- **Throughput**: Requests per second
- **Alert MTTR**: Mean time to resolve alerts

## Alert Conditions

Alerts are automatically generated for:

1. **High Error Rate**: Error rate > 0.1%
2. **High Response Time**: P95 > 1 second
3. **Low Success Rate**: Success rate < 95%
4. **Server Unavailable**: Failed health checks
5. **Resource Exhaustion**: High CPU/memory usage
6. **Security Events**: Authentication failures, rate limits

## Integration Examples

### With FastAPI

```python
from fastapi import FastAPI
from app.service.mcp_servers.monitoring import get_monitoring_integration

app = FastAPI()
integration = get_monitoring_integration()

# Add monitoring middleware
app.add_middleware(integration.create_monitoring_middleware())
```

### With Investigation Workflow

```python
async def investigate_fraud(investigation_id: str):
    # Setup monitoring for this investigation
    track = await integration.monitor_investigation(
        investigation_id,
        callback=on_task_complete
    )
    
    # Execute investigation tasks
    for task in investigation_tasks:
        result = await execute_task(task)
        await track({
            "server": task.server,
            "type": task.type,
            "success": result.success,
            "duration": result.duration
        })
```

## Testing

Run the test suite:

```bash
pytest test/unit/test_mcp_monitoring.py -v
```

Run with coverage:

```bash
pytest test/unit/test_mcp_monitoring.py --cov=app.service.mcp_servers.monitoring
```

## Performance Considerations

- Health checks are performed asynchronously
- Metrics are aggregated in memory with configurable retention
- WebSocket updates are throttled to prevent overload
- Alert cooldowns prevent alert storms
- Prometheus metrics are cached and updated periodically

## Troubleshooting

### High Memory Usage
- Reduce `metrics_window` to retain less historical data
- Increase aggregation interval
- Enable metric sampling for high-volume servers

### Missing Metrics
- Verify servers are registered in monitoring
- Check health check logs for failures
- Ensure monitoring hooks are properly registered

### Alert Storm
- Increase `alert_cooldown` period
- Adjust alert thresholds
- Enable alert grouping

## Future Enhancements

- [ ] Machine learning-based anomaly detection
- [ ] Predictive failure analysis
- [ ] Automated remediation actions
- [ ] Custom metric definitions
- [ ] Multi-region monitoring support
- [ ] Advanced visualization options
- [ ] Integration with cloud monitoring services

## Support

For issues or questions, please contact the Olorin platform team or create an issue in the repository.