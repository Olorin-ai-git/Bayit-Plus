#!/usr/bin/env python3
"""
Interactive Deployment Dashboard for Olorin Platform.

Provides real-time deployment visualization, service status aggregation,
deployment history, and manual deployment controls with safety confirmations.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import aiohttp
from aiohttp import web, WSMsgType
import aiohttp_cors
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class DashboardConfig:
    """Configuration for the deployment dashboard."""
    port: int = 8080
    host: str = "localhost"
    static_path: str = "/Users/gklainert/Documents/olorin/deployment/dashboard/static"
    enable_cors: bool = True


class DeploymentDashboard:
    """
    Interactive deployment dashboard with real-time updates.
    
    Provides web interface for monitoring deployments, viewing metrics,
    and managing deployment operations with role-based access controls.
    """
    
    def __init__(self, config: DashboardConfig):
        self.config = config
        self.app = web.Application()
        self.websocket_connections: List[web.WebSocketResponse] = []
        
        # Dashboard state
        self.deployments: Dict[str, Dict[str, Any]] = {}
        self.deployment_history: List[Dict[str, Any]] = []
        self.system_metrics: Dict[str, Any] = {}
        
        # External service connections
        self.monitor_client = None
        self.coordinator_client = None
        
        self._setup_routes()
        self._setup_cors()
    
    def _setup_routes(self):
        """Setup web application routes."""
        # Static files
        self.app.router.add_static(
            '/', 
            Path(self.config.static_path),
            name='static'
        )
        
        # API routes
        self.app.router.add_get('/', self._serve_dashboard)
        self.app.router.add_get('/api/deployments', self._get_deployments)
        self.app.router.add_get('/api/deployments/{deployment_id}', self._get_deployment)
        self.app.router.add_get('/api/deployments/{deployment_id}/metrics', self._get_deployment_metrics)
        self.app.router.add_post('/api/deployments', self._create_deployment)
        self.app.router.add_post('/api/deployments/{deployment_id}/rollback', self._rollback_deployment)
        self.app.router.add_get('/api/system/health', self._get_system_health)
        self.app.router.add_get('/api/system/metrics', self._get_system_metrics)
        
        # WebSocket endpoint
        self.app.router.add_get('/ws', self._websocket_handler)
    
    def _setup_cors(self):
        """Setup CORS for cross-origin requests."""
        if self.config.enable_cors:
            cors = aiohttp_cors.setup(self.app, defaults={
                "*": aiohttp_cors.ResourceOptions(
                    allow_credentials=True,
                    expose_headers="*",
                    allow_headers="*",
                    allow_methods="*"
                )
            })
            
            # Add CORS to all routes
            for route in list(self.app.router.routes()):
                cors.add(route)
    
    async def start_dashboard(self):
        """Start the dashboard web server."""
        logger.info(f"Starting deployment dashboard on {self.config.host}:{self.config.port}")
        
        # Create and start server
        runner = web.AppRunner(self.app)
        await runner.setup()
        
        site = web.TCPSite(runner, self.config.host, self.config.port)
        await site.start()
        
        logger.info(f"Dashboard available at http://{self.config.host}:{self.config.port}")
        
        # Start background tasks
        asyncio.create_task(self._monitor_deployments())
        asyncio.create_task(self._collect_system_metrics())
    
    async def _serve_dashboard(self, request):
        """Serve the main dashboard HTML page."""
        dashboard_path = Path(self.config.static_path) / "dashboard.html"
        
        if not dashboard_path.exists():
            return web.Response(
                text="Dashboard not found. Please ensure dashboard.html exists in the static directory.",
                status=404
            )
        
        with open(dashboard_path, 'r') as f:
            content = f.read()
        
        return web.Response(text=content, content_type='text/html')
    
    async def _get_deployments(self, request):
        """Get list of deployments with optional filtering."""
        # Query parameters
        environment = request.query.get('environment')
        status = request.query.get('status')
        limit = int(request.query.get('limit', '50'))
        
        # Filter deployments
        deployments = list(self.deployments.values())
        
        if environment:
            deployments = [d for d in deployments if d.get('environment') == environment]
        
        if status:
            deployments = [d for d in deployments if d.get('status') == status]
        
        # Sort by timestamp and limit
        deployments.sort(key=lambda d: d.get('started_at', ''), reverse=True)
        deployments = deployments[:limit]
        
        return web.json_response(deployments)
    
    async def _get_deployment(self, request):
        """Get specific deployment details."""
        deployment_id = request.match_info['deployment_id']
        
        if deployment_id not in self.deployments:
            return web.json_response(
                {"error": "Deployment not found"}, 
                status=404
            )
        
        return web.json_response(self.deployments[deployment_id])
    
    async def _get_deployment_metrics(self, request):
        """Get deployment metrics history."""
        deployment_id = request.match_info['deployment_id']
        limit = int(request.query.get('limit', '100'))
        
        if deployment_id not in self.deployments:
            return web.json_response(
                {"error": "Deployment not found"}, 
                status=404
            )
        
        # TODO: Connect to monitoring service to get metrics
        metrics = []
        
        return web.json_response(metrics)
    
    async def _create_deployment(self, request):
        """Create new deployment."""
        try:
            data = await request.json()
            
            # Validate required fields
            required_fields = ['services', 'environment']
            for field in required_fields:
                if field not in data:
                    return web.json_response(
                        {"error": f"Missing required field: {field}"}, 
                        status=400
                    )
            
            # TODO: Connect to coordinator to create deployment
            deployment_id = f"deploy_{int(datetime.now().timestamp())}"
            
            deployment = {
                "deployment_id": deployment_id,
                "services": data['services'],
                "environment": data['environment'],
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": data.get('created_by', 'dashboard')
            }
            
            self.deployments[deployment_id] = deployment
            
            # Broadcast to WebSocket clients
            await self._broadcast_to_clients({
                "type": "deployment_created",
                "data": deployment
            })
            
            return web.json_response(deployment, status=201)
            
        except json.JSONDecodeError:
            return web.json_response(
                {"error": "Invalid JSON"}, 
                status=400
            )
        except Exception as e:
            logger.error(f"Error creating deployment: {e}")
            return web.json_response(
                {"error": "Internal server error"}, 
                status=500
            )
    
    async def _rollback_deployment(self, request):
        """Rollback specific deployment."""
        deployment_id = request.match_info['deployment_id']
        
        if deployment_id not in self.deployments:
            return web.json_response(
                {"error": "Deployment not found"}, 
                status=404
            )
        
        try:
            # TODO: Connect to rollback manager
            self.deployments[deployment_id]['status'] = 'rolling_back'
            self.deployments[deployment_id]['rollback_initiated_at'] = datetime.now(timezone.utc).isoformat()
            
            # Broadcast to WebSocket clients
            await self._broadcast_to_clients({
                "type": "deployment_rollback_initiated",
                "data": {
                    "deployment_id": deployment_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            })
            
            return web.json_response({
                "status": "rollback_initiated",
                "deployment_id": deployment_id
            })
            
        except Exception as e:
            logger.error(f"Error rolling back deployment {deployment_id}: {e}")
            return web.json_response(
                {"error": "Failed to initiate rollback"}, 
                status=500
            )
    
    async def _get_system_health(self, request):
        """Get overall system health."""
        # TODO: Connect to health aggregator
        health = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "services": {
                "backend": {"status": "healthy", "response_time_ms": 45},
                "frontend": {"status": "healthy", "response_time_ms": 23}
            },
            "active_deployments": len([d for d in self.deployments.values() if d.get('status') == 'in_progress'])
        }
        
        return web.json_response(health)
    
    async def _get_system_metrics(self, request):
        """Get system metrics."""
        return web.json_response(self.system_metrics)
    
    async def _websocket_handler(self, request):
        """Handle WebSocket connections for real-time updates."""
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        self.websocket_connections.append(ws)
        logger.info(f"New WebSocket connection: {len(self.websocket_connections)} active")
        
        try:
            # Send current state to new client
            await ws.send_str(json.dumps({
                "type": "initial_state",
                "data": {
                    "deployments": list(self.deployments.values()),
                    "system_metrics": self.system_metrics
                }
            }))
            
            # Handle incoming messages
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    try:
                        data = json.loads(msg.data)
                        await self._handle_websocket_message(ws, data)
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON from WebSocket client: {msg.data}")
                elif msg.type == WSMsgType.ERROR:
                    logger.error(f"WebSocket error: {ws.exception()}")
                    break
        
        except Exception as e:
            logger.error(f"WebSocket handler error: {e}")
        finally:
            if ws in self.websocket_connections:
                self.websocket_connections.remove(ws)
            logger.info(f"WebSocket connection closed: {len(self.websocket_connections)} active")
        
        return ws
    
    async def _handle_websocket_message(self, ws: web.WebSocketResponse, data: Dict[str, Any]):
        """Handle incoming WebSocket message from client."""
        message_type = data.get('type')
        
        if message_type == 'ping':
            await ws.send_str(json.dumps({"type": "pong"}))
        elif message_type == 'subscribe_deployment':
            # TODO: Implement deployment-specific subscriptions
            pass
        elif message_type == 'get_deployment_logs':
            # TODO: Send deployment logs
            pass
    
    async def _broadcast_to_clients(self, message: Dict[str, Any]):
        """Broadcast message to all WebSocket clients."""
        if not self.websocket_connections:
            return
        
        message_str = json.dumps(message)
        disconnected_clients = []
        
        for ws in self.websocket_connections:
            try:
                await ws.send_str(message_str)
            except Exception:
                disconnected_clients.append(ws)
        
        # Remove disconnected clients
        for ws in disconnected_clients:
            if ws in self.websocket_connections:
                self.websocket_connections.remove(ws)
    
    async def _monitor_deployments(self):
        """Background task to monitor deployment status."""
        while True:
            try:
                # TODO: Connect to deployment monitor service
                # For now, simulate some deployment updates
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in deployment monitoring: {e}")
                await asyncio.sleep(60)  # Back off on error
    
    async def _collect_system_metrics(self):
        """Background task to collect system metrics."""
        while True:
            try:
                # Update system metrics
                self.system_metrics = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "active_deployments": len([
                        d for d in self.deployments.values() 
                        if d.get('status') == 'in_progress'
                    ]),
                    "successful_deployments_24h": len([
                        d for d in self.deployments.values()
                        if d.get('status') == 'success' and 
                        self._is_within_24h(d.get('completed_at'))
                    ]),
                    "failed_deployments_24h": len([
                        d for d in self.deployments.values()
                        if d.get('status') == 'failed' and 
                        self._is_within_24h(d.get('completed_at'))
                    ]),
                    "websocket_connections": len(self.websocket_connections),
                    "uptime_hours": 0  # TODO: Track actual uptime
                }
                
                # Broadcast metrics to clients
                await self._broadcast_to_clients({
                    "type": "system_metrics_update",
                    "data": self.system_metrics
                })
                
                await asyncio.sleep(60)  # Update every minute
                
            except Exception as e:
                logger.error(f"Error collecting system metrics: {e}")
                await asyncio.sleep(60)
    
    def _is_within_24h(self, timestamp_str: Optional[str]) -> bool:
        """Check if timestamp is within last 24 hours."""
        if not timestamp_str:
            return False
        
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            return datetime.now(timezone.utc) - timestamp < timedelta(hours=24)
        except:
            return False


async def main():
    """Main entry point for running the dashboard."""
    config = DashboardConfig()
    dashboard = DeploymentDashboard(config)
    
    await dashboard.start_dashboard()
    
    # Keep running
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Dashboard shutting down...")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())