"""
MCP Monitoring Dashboard

Real-time dashboard and reporting for MCP server monitoring with
web interface, API endpoints, and integration with enterprise systems.
"""

import asyncio
import json
from dataclasses import asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST

from app.service.logging import get_bridge_logger

from .mcp_monitor import AlertSeverity, HealthStatus, MCPMonitor, get_mcp_monitor

logger = get_bridge_logger(__name__)


class MCPDashboard:
    """
    Web-based dashboard for MCP monitoring visualization.

    Provides real-time metrics, health status, alerts, and
    comprehensive reporting through web interface and APIs.
    """

    def __init__(self, monitor: Optional[MCPMonitor] = None):
        """
        Initialize the dashboard.

        Args:
            monitor: MCP monitor instance to use
        """
        self.monitor = monitor or get_mcp_monitor()
        self.app = FastAPI(title="MCP Monitoring Dashboard")
        self.websocket_clients: List[WebSocket] = []
        self._setup_routes()

    def _setup_routes(self):
        """Setup FastAPI routes for the dashboard."""

        @self.app.get("/", response_class=HTMLResponse)
        async def dashboard_home():
            """Serve the main dashboard HTML."""
            return self._generate_dashboard_html()

        @self.app.get("/api/health")
        async def health_status():
            """Get overall system health status."""
            servers_health = {}
            for server_name in self.monitor.servers.keys():
                status = self.monitor.get_server_status(server_name)
                servers_health[server_name] = {
                    "status": status.value if status else "unknown",
                    "healthy": status == HealthStatus.HEALTHY if status else False,
                }

            # Determine overall health
            all_healthy = all(s["healthy"] for s in servers_health.values())

            return {
                "overall_status": "healthy" if all_healthy else "degraded",
                "servers": servers_health,
                "timestamp": datetime.now().isoformat(),
            }

        @self.app.get("/api/metrics")
        async def get_metrics():
            """Get current metrics for all servers."""
            return self.monitor.get_metrics_summary()

        @self.app.get("/api/metrics/{server_name}")
        async def get_server_metrics(server_name: str):
            """Get detailed metrics for a specific server."""
            if server_name not in self.monitor.servers:
                raise HTTPException(status_code=404, detail="Server not found")

            metrics = self.monitor.servers[server_name]
            return {
                "server_name": server_name,
                "metrics": {
                    "response_times": {
                        "average": metrics.avg_response_time,
                        "p95": metrics.p95_response_time,
                        "p99": metrics.p99_response_time,
                    },
                    "success_rate": metrics.success_rate,
                    "error_rate": metrics.error_rate,
                    "throughput": metrics.throughput,
                    "total_requests": metrics.total_requests,
                    "last_error": metrics.last_error,
                    "last_error_time": (
                        metrics.last_error_time.isoformat()
                        if metrics.last_error_time
                        else None
                    ),
                    "resources": {
                        "memory_mb": metrics.memory_usage_mb,
                        "cpu_percent": metrics.cpu_usage_percent,
                        "active_connections": metrics.active_connections,
                        "queue_depth": metrics.queue_depth,
                    },
                },
            }

        @self.app.get("/api/alerts")
        async def get_alerts():
            """Get active alerts."""
            alerts = self.monitor.get_active_alerts()
            return {
                "active_count": len(alerts),
                "alerts": [
                    {
                        "id": alert.alert_id,
                        "server": alert.server_name,
                        "severity": alert.severity.value,
                        "title": alert.title,
                        "description": alert.description,
                        "timestamp": alert.timestamp.isoformat(),
                    }
                    for alert in alerts
                ],
            }

        @self.app.post("/api/alerts/{alert_id}/resolve")
        async def resolve_alert(alert_id: str):
            """Resolve an alert."""
            await self.monitor.resolve_alert(alert_id)
            return {"status": "resolved", "alert_id": alert_id}

        @self.app.get("/api/sla")
        async def get_sla_report():
            """Get SLA compliance report."""
            return await self.monitor._generate_sla_report()

        @self.app.get("/api/history/{server_name}")
        async def get_server_history(server_name: str, hours: int = 1):
            """Get historical data for a server."""
            if server_name not in self.monitor.servers:
                raise HTTPException(status_code=404, detail="Server not found")

            # Get health history
            health_history = list(self.monitor.health_history[server_name])

            # Filter by time window
            cutoff_time = datetime.now() - timedelta(hours=hours)
            filtered_history = [
                hc for hc in health_history if hc.timestamp >= cutoff_time
            ]

            return {
                "server_name": server_name,
                "time_window_hours": hours,
                "history": [
                    {
                        "timestamp": hc.timestamp.isoformat(),
                        "status": hc.status.value,
                        "response_time_ms": hc.response_time_ms,
                        "checks_passed": hc.checks_passed,
                    }
                    for hc in filtered_history
                ],
            }

        @self.app.get("/metrics", response_class=HTMLResponse)
        async def prometheus_metrics():
            """Export Prometheus metrics."""
            metrics = self.monitor.export_prometheus_metrics()
            return metrics

        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket endpoint for real-time updates."""
            await websocket.accept()
            self.websocket_clients.append(websocket)

            try:
                # Send initial data
                await self._send_websocket_update(websocket)

                # Keep connection alive and send updates
                while True:
                    await asyncio.sleep(5)  # Update every 5 seconds
                    await self._send_websocket_update(websocket)

            except WebSocketDisconnect:
                self.websocket_clients.remove(websocket)
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                if websocket in self.websocket_clients:
                    self.websocket_clients.remove(websocket)

    async def _send_websocket_update(self, websocket: WebSocket):
        """Send real-time update to WebSocket client."""
        try:
            update = {
                "type": "metrics_update",
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "metrics": self.monitor.get_metrics_summary(),
                    "alerts": len(self.monitor.get_active_alerts()),
                    "health": {
                        server: self.monitor.get_server_status(server).value
                        for server in self.monitor.servers.keys()
                    },
                },
            }

            await websocket.send_json(update)

        except Exception as e:
            logger.error(f"Failed to send WebSocket update: {e}")

    async def broadcast_update(self, update_type: str, data: Dict[str, Any]):
        """Broadcast update to all connected WebSocket clients."""
        message = {
            "type": update_type,
            "timestamp": datetime.now().isoformat(),
            "data": data,
        }

        disconnected = []
        for client in self.websocket_clients:
            try:
                await client.send_json(message)
            except:
                disconnected.append(client)

        # Remove disconnected clients
        for client in disconnected:
            self.websocket_clients.remove(client)

    def _generate_dashboard_html(self) -> str:
        """Generate the dashboard HTML page."""
        return """
<!DOCTYPE html>
<html>
<head>
    <title>MCP Monitoring Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 1.1em;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .card-title {
            font-size: 1.3em;
            color: #444;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #eee;
        }
        .metric:last-child {
            border-bottom: none;
        }
        .metric-label {
            color: #666;
            font-size: 0.95em;
        }
        .metric-value {
            font-size: 1.1em;
            font-weight: 600;
            color: #333;
        }
        .status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status.healthy { background: #d4f4dd; color: #1e7e34; }
        .status.degraded { background: #fff3cd; color: #856404; }
        .status.unhealthy { background: #f8d7da; color: #721c24; }
        .status.critical { background: #721c24; color: white; }
        .alert {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 4px;
        }
        .alert.critical {
            background: #f8d7da;
            border-left-color: #dc3545;
        }
        .chart-container {
            height: 300px;
            margin-top: 20px;
        }
        .connection-status {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .connection-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #28a745;
            animation: pulse 2s infinite;
        }
        .connection-dot.disconnected {
            background: #dc3545;
            animation: none;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 MCP Monitoring Dashboard</h1>
            <div class="subtitle">Real-time monitoring and observability for MCP servers</div>
        </div>
        
        <div class="grid">
            <div class="card">
                <div class="card-title">System Health</div>
                <div id="health-status"></div>
            </div>
            
            <div class="card">
                <div class="card-title">Active Alerts</div>
                <div id="alerts-container"></div>
            </div>
            
            <div class="card">
                <div class="card-title">Performance Metrics</div>
                <div id="metrics-container"></div>
            </div>
            
            <div class="card">
                <div class="card-title">SLA Compliance</div>
                <div id="sla-container"></div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title">Response Time Trends</div>
            <div class="chart-container">
                <canvas id="responseTimeChart"></canvas>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title">Success Rate Trends</div>
            <div class="chart-container">
                <canvas id="successRateChart"></canvas>
            </div>
        </div>
    </div>
    
    <div class="connection-status">
        <div class="connection-dot" id="connectionDot"></div>
        <span id="connectionText">Connected</span>
    </div>
    
    <script>
        let ws = null;
        let responseTimeChart = null;
        let successRateChart = null;
        
        // Initialize WebSocket connection
        function connectWebSocket() {
            ws = new WebSocket(`ws://${window.location.host}/ws`);
            
            ws.onopen = () => {
                updateConnectionStatus(true);
                console.log('WebSocket connected');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                updateDashboard(data);
            };
            
            ws.onclose = () => {
                updateConnectionStatus(false);
                console.log('WebSocket disconnected, reconnecting...');
                setTimeout(connectWebSocket, 3000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        }
        
        function updateConnectionStatus(connected) {
            const dot = document.getElementById('connectionDot');
            const text = document.getElementById('connectionText');
            
            if (connected) {
                dot.classList.remove('disconnected');
                text.textContent = 'Connected';
            } else {
                dot.classList.add('disconnected');
                text.textContent = 'Disconnected';
            }
        }
        
        function updateDashboard(data) {
            if (data.type === 'metrics_update') {
                updateHealth(data.data.health);
                updateMetrics(data.data.metrics);
                updateAlerts(data.data.alerts);
            }
        }
        
        function updateHealth(health) {
            const container = document.getElementById('health-status');
            let html = '';
            
            for (const [server, status] of Object.entries(health)) {
                html += `
                    <div class="metric">
                        <span class="metric-label">${server}</span>
                        <span class="status ${status}">${status}</span>
                    </div>
                `;
            }
            
            container.innerHTML = html;
        }
        
        function updateMetrics(metrics) {
            const container = document.getElementById('metrics-container');
            let html = '';
            
            if (metrics.servers) {
                for (const [server, data] of Object.entries(metrics.servers)) {
                    html += `
                        <div class="metric">
                            <span class="metric-label">${server} Success Rate</span>
                            <span class="metric-value">${data.success_rate.toFixed(1)}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">${server} Avg Response</span>
                            <span class="metric-value">${data.avg_response_time.toFixed(0)}ms</span>
                        </div>
                    `;
                }
            }
            
            container.innerHTML = html;
        }
        
        function updateAlerts(alertCount) {
            const container = document.getElementById('alerts-container');
            
            if (alertCount === 0) {
                container.innerHTML = '<div style="color: #28a745;">✓ No active alerts</div>';
            } else {
                container.innerHTML = `<div style="color: #dc3545;">⚠ ${alertCount} active alert(s)</div>`;
            }
        }
        
        // Initialize charts
        function initCharts() {
            const ctx1 = document.getElementById('responseTimeChart').getContext('2d');
            responseTimeChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Response Time (ms)'
                            }
                        }
                    }
                }
            });
            
            const ctx2 = document.getElementById('successRateChart').getContext('2d');
            successRateChart = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Success Rate (%)'
                            }
                        }
                    }
                }
            });
        }
        
        // Load initial data
        async function loadInitialData() {
            try {
                const [health, metrics, alerts, sla] = await Promise.all([
                    fetch('/api/health').then(r => r.json()),
                    fetch('/api/metrics').then(r => r.json()),
                    fetch('/api/alerts').then(r => r.json()),
                    fetch('/api/sla').then(r => r.json())
                ]);
                
                updateHealth(health.servers);
                updateMetrics(metrics);
                updateAlerts(alerts.active_count);
                updateSLA(sla);
                
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        }
        
        function updateSLA(sla) {
            const container = document.getElementById('sla-container');
            let html = '';
            
            if (sla.overall) {
                html += `
                    <div class="metric">
                        <span class="metric-label">Availability</span>
                        <span class="metric-value">${sla.overall.availability.toFixed(2)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Avg Response Time</span>
                        <span class="metric-value">${sla.overall.avg_response_time.toFixed(0)}ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Error Rate</span>
                        <span class="metric-value">${sla.overall.error_rate.toFixed(2)}%</span>
                    </div>
                `;
            }
            
            container.innerHTML = html;
        }
        
        // Initialize on page load
        window.addEventListener('DOMContentLoaded', () => {
            connectWebSocket();
            initCharts();
            loadInitialData();
        });
    </script>
</body>
</html>
        """


def create_dashboard_app(monitor: Optional[MCPMonitor] = None) -> FastAPI:
    """
    Create a FastAPI application for the monitoring dashboard.

    Args:
        monitor: MCP monitor instance to use

    Returns:
        FastAPI application instance
    """
    dashboard = MCPDashboard(monitor)
    return dashboard.app
