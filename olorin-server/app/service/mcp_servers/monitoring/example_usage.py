"""
Example usage and integration of MCP Monitoring System

This module demonstrates how to integrate the MCP monitoring system
with the Olorin fraud detection platform.
"""

import asyncio
import logging
from typing import Dict, Any
from datetime import datetime

# FastAPI integration
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# MCP components
from ...agent.orchestration.mcp_coordinator import get_mcp_coordinator
from ...agent.orchestration.mcp_server_registry import MCPServerRegistry
from ..security.mcp_auth import MCPSecurityManager

# Monitoring components
from .mcp_monitor import (
    MCPMonitor,
    get_mcp_monitor,
    monitor_operation,
    HealthStatus,
    AlertSeverity
)
from .dashboard import create_dashboard_app
from .integration import (
    MCPMonitoringIntegration,
    setup_mcp_monitoring,
    get_monitoring_integration
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def basic_monitoring_example():
    """Basic example of using MCP monitoring."""
    print("\n=== Basic Monitoring Example ===\n")
    
    # Create monitor
    monitor = MCPMonitor(
        check_interval=30,
        metrics_window=3600,
        alert_cooldown=300,
        enable_prometheus=True
    )
    
    # Start monitoring servers
    servers = ["fraud_database", "external_api", "graph_analysis"]
    await monitor.start_monitoring(servers)
    
    try:
        # Simulate some operations
        print("Simulating MCP operations...")
        
        # Successful operation
        async with monitor_operation(monitor, "fraud_database", "query"):
            await asyncio.sleep(0.1)  # Simulate database query
            print("✓ Database query completed")
        
        # Another successful operation
        async with monitor_operation(monitor, "external_api", "verification"):
            await asyncio.sleep(0.15)  # Simulate API call
            print("✓ API verification completed")
        
        # Failed operation
        try:
            async with monitor_operation(monitor, "graph_analysis", "analyze"):
                await asyncio.sleep(0.05)
                raise Exception("Graph analysis failed: insufficient data")
        except Exception as e:
            print(f"✗ Operation failed: {e}")
        
        # Record some manual metrics
        for i in range(5):
            await monitor.record_request(
                server_name="fraud_database",
                operation="batch_query",
                success=True,
                response_time_ms=50 + i * 10
            )
        
        # Get current metrics
        print("\n📊 Current Metrics Summary:")
        summary = monitor.get_metrics_summary()
        for server, metrics in summary["servers"].items():
            print(f"\n{server}:")
            print(f"  Status: {metrics['status']}")
            print(f"  Success Rate: {metrics['success_rate']:.1f}%")
            print(f"  Avg Response Time: {metrics['avg_response_time']:.1f}ms")
            print(f"  Total Requests: {metrics['total_requests']}")
        
        # Check for alerts
        alerts = monitor.get_active_alerts()
        if alerts:
            print(f"\n⚠️ Active Alerts: {len(alerts)}")
            for alert in alerts:
                print(f"  - [{alert.severity.value.upper()}] {alert.title}")
        else:
            print("\n✅ No active alerts")
        
    finally:
        # Stop monitoring
        await monitor.stop_monitoring()
        print("\nMonitoring stopped")


async def integrated_monitoring_example():
    """Example of integrated monitoring with MCP components."""
    print("\n=== Integrated Monitoring Example ===\n")
    
    # Create MCP components (mocked for example)
    coordinator = get_mcp_coordinator()
    registry = MCPServerRegistry()
    security_manager = MCPSecurityManager()
    
    # Setup integrated monitoring
    integration = await setup_mcp_monitoring(
        coordinator=coordinator,
        registry=registry,
        security_manager=security_manager
    )
    
    try:
        # Monitor a specific investigation
        investigation_id = "inv_20240831_001"
        
        async def on_task_complete(task_info: Dict[str, Any]):
            """Callback for task completion."""
            print(f"Task completed: {task_info.get('type')} on {task_info.get('server')}")
        
        track_task = await integration.monitor_investigation(
            investigation_id,
            callback=on_task_complete
        )
        
        # Simulate investigation tasks
        print(f"Monitoring investigation: {investigation_id}")
        
        tasks = [
            {"server": "fraud_database", "type": "user_history", "success": True, "duration": 0.5},
            {"server": "external_api", "type": "device_check", "success": True, "duration": 0.3},
            {"server": "graph_analysis", "type": "pattern_analysis", "success": True, "duration": 1.2},
            {"server": "fraud_database", "type": "transaction_analysis", "success": False, "duration": 0.8},
        ]
        
        for task in tasks:
            await track_task(task)
            await asyncio.sleep(0.1)
        
        # Generate performance report
        print("\n📈 Performance Report:")
        report = await integration.generate_performance_report(time_window_hours=1)
        
        print(f"Generated at: {report['generated_at']}")
        print(f"Time window: {report['time_window_hours']} hours")
        
        for server, metrics in report["servers"].items():
            print(f"\n{server}:")
            print(f"  Total Requests: {metrics['total_requests']}")
            print(f"  Success Rate: {metrics['success_rate']:.1f}%")
            print(f"  P95 Response Time: {metrics['p95_response_time']:.1f}ms")
        
        # Export metrics for Grafana
        print("\n📊 Exporting metrics for Grafana...")
        grafana_metrics = await integration.export_metrics_for_grafana()
        print(f"Exported {len(grafana_metrics)} metric series")
        
    finally:
        # Cleanup
        await integration.cleanup()
        print("\nIntegration cleaned up")


def create_monitored_app() -> FastAPI:
    """
    Create a FastAPI application with integrated monitoring.
    
    Returns:
        FastAPI application with monitoring
    """
    app = FastAPI(title="Olorin MCP Service with Monitoring")
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Get monitoring integration
    integration = get_monitoring_integration()
    
    # Add monitoring middleware
    @app.middleware("http")
    async def monitoring_middleware(request, call_next):
        """Monitor all HTTP requests."""
        return await integration.create_monitoring_middleware()(request, call_next)
    
    # Health endpoint
    @app.get("/health")
    async def health_check():
        """System health check."""
        monitor = get_mcp_monitor()
        
        servers_health = {}
        all_healthy = True
        
        for server_name in monitor.servers.keys():
            status = monitor.get_server_status(server_name)
            is_healthy = status == HealthStatus.HEALTHY
            servers_health[server_name] = {
                "status": status.value if status else "unknown",
                "healthy": is_healthy
            }
            if not is_healthy:
                all_healthy = False
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": datetime.now().isoformat(),
            "servers": servers_health
        }
    
    # MCP operation endpoint
    @app.post("/mcp/{server_name}/{operation}")
    async def execute_mcp_operation(
        server_name: str,
        operation: str,
        payload: Dict[str, Any]
    ):
        """Execute an MCP operation with monitoring."""
        monitor = get_mcp_monitor()
        
        try:
            # Monitor the operation
            async with monitor_operation(monitor, server_name, operation):
                # Simulate operation execution
                await asyncio.sleep(0.1)
                
                # Check if server is healthy
                status = monitor.get_server_status(server_name)
                if status == HealthStatus.CRITICAL:
                    raise HTTPException(
                        status_code=503,
                        detail=f"Server {server_name} is in critical state"
                    )
                
                return {
                    "status": "success",
                    "server": server_name,
                    "operation": operation,
                    "result": f"Operation {operation} completed successfully"
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Operation failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # Metrics endpoint
    @app.get("/metrics/summary")
    async def get_metrics_summary():
        """Get current metrics summary."""
        monitor = get_mcp_monitor()
        return monitor.get_metrics_summary()
    
    # Alerts endpoint
    @app.get("/alerts")
    async def get_alerts():
        """Get active alerts."""
        monitor = get_mcp_monitor()
        alerts = monitor.get_active_alerts()
        
        return {
            "count": len(alerts),
            "alerts": [
                {
                    "id": alert.alert_id,
                    "server": alert.server_name,
                    "severity": alert.severity.value,
                    "title": alert.title,
                    "description": alert.description,
                    "timestamp": alert.timestamp.isoformat()
                }
                for alert in alerts
            ]
        }
    
    @app.post("/alerts/{alert_id}/resolve")
    async def resolve_alert(alert_id: str):
        """Resolve an alert."""
        monitor = get_mcp_monitor()
        await monitor.resolve_alert(alert_id)
        return {"status": "resolved", "alert_id": alert_id}
    
    return app


async def run_dashboard_server():
    """Run the monitoring dashboard server."""
    print("\n=== Starting MCP Monitoring Dashboard ===\n")
    
    # Setup monitoring
    monitor = get_mcp_monitor()
    servers = ["fraud_database", "external_api", "graph_analysis"]
    await monitor.start_monitoring(servers)
    
    # Create dashboard app
    dashboard_app = create_dashboard_app(monitor)
    
    # Create main app with monitoring
    main_app = create_monitored_app()
    
    # Mount dashboard
    main_app.mount("/dashboard", dashboard_app)
    
    print("📊 Dashboard available at: http://localhost:8000/dashboard")
    print("📈 Metrics API at: http://localhost:8000/metrics/summary")
    print("🔔 Alerts API at: http://localhost:8000/alerts")
    print("💚 Health check at: http://localhost:8000/health")
    print("\nPress Ctrl+C to stop the server")
    
    # Run server
    config = uvicorn.Config(
        app=main_app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()


async def demonstrate_alert_scenarios():
    """Demonstrate various alert scenarios."""
    print("\n=== Alert Scenarios Demo ===\n")
    
    monitor = MCPMonitor(
        check_interval=5,
        alert_cooldown=10,
        enable_prometheus=True
    )
    
    await monitor.start_monitoring(["test_server"])
    
    try:
        print("Simulating various failure scenarios...")
        
        # Scenario 1: High error rate
        print("\n1. High Error Rate Scenario:")
        for i in range(10):
            await monitor.record_request(
                server_name="test_server",
                operation="process",
                success=i < 3,  # 30% success rate
                response_time_ms=100
            )
        
        await monitor._evaluate_alerts()
        
        # Scenario 2: High response time
        print("\n2. High Response Time Scenario:")
        for i in range(5):
            await monitor.record_request(
                server_name="test_server",
                operation="slow_query",
                success=True,
                response_time_ms=2000 + i * 500  # Very slow
            )
        
        await monitor._aggregate_metrics(monitor.servers["test_server"])
        await monitor._evaluate_alerts()
        
        # Check alerts
        alerts = monitor.get_active_alerts()
        print(f"\n🔔 Generated {len(alerts)} alerts:")
        for alert in alerts:
            print(f"  [{alert.severity.value.upper()}] {alert.title}")
            print(f"    {alert.description}")
        
        # Resolve an alert
        if alerts:
            alert_id = alerts[0].alert_id
            print(f"\nResolving alert: {alert_id}")
            await monitor.resolve_alert(alert_id)
            
            resolved_alert = monitor.active_alerts[alert_id]
            print(f"Alert resolved at: {resolved_alert.resolved_at}")
        
    finally:
        await monitor.stop_monitoring()


async def main():
    """Main function to run all examples."""
    print("=" * 60)
    print("MCP MONITORING SYSTEM - EXAMPLE USAGE")
    print("=" * 60)
    
    # Run basic monitoring example
    await basic_monitoring_example()
    
    # Run integrated monitoring example
    await integrated_monitoring_example()
    
    # Demonstrate alert scenarios
    await demonstrate_alert_scenarios()
    
    # Optionally run the dashboard server
    # await run_dashboard_server()
    
    print("\n" + "=" * 60)
    print("All examples completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())