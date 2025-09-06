#!/usr/bin/env python3
"""
Real-Time Deployment Monitor for Olorin Platform.

Provides live deployment status tracking, WebSocket integration,
performance metrics collection, and deployment timeline analysis.
"""

import asyncio
import json
import logging
import websockets
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
import time
import psutil

logger = logging.getLogger(__name__)


class MonitoringEvent(Enum):
    """Types of monitoring events."""
    DEPLOYMENT_STARTED = "deployment_started"
    DEPLOYMENT_UPDATED = "deployment_updated"
    DEPLOYMENT_COMPLETED = "deployment_completed"
    DEPLOYMENT_FAILED = "deployment_failed"
    SERVICE_STATUS_CHANGED = "service_status_changed"
    HEALTH_CHECK_RESULT = "health_check_result"
    PERFORMANCE_METRIC = "performance_metric"


@dataclass
class DeploymentMetrics:
    """Performance metrics during deployment."""
    deployment_id: str
    timestamp: datetime
    phase: str
    cpu_usage: float
    memory_usage_mb: float
    disk_usage_mb: float
    network_io_mb: float
    response_time_ms: float
    active_connections: int


@dataclass
class MonitoringUpdate:
    """Real-time monitoring update message."""
    event_type: MonitoringEvent
    deployment_id: str
    timestamp: datetime
    data: Dict[str, Any]
    source: str = "deployment_monitor"


class DeploymentMonitor:
    """
    Real-time deployment monitoring with WebSocket broadcasting.
    
    Tracks deployment progress, collects performance metrics, and provides
    live updates to connected clients via WebSocket connections.
    """
    
    def __init__(self, port: int = 8765):
        self.port = port
        self.connected_clients: Set[websockets.WebSocketServerProtocol] = set()
        self.active_deployments: Dict[str, Dict[str, Any]] = {}
        self.metrics_history: Dict[str, List[DeploymentMetrics]] = {}
        
        # Monitoring configuration
        self.metrics_interval = 5  # seconds
        self.max_metrics_history = 1000
        
        # WebSocket server
        self.websocket_server = None
        self._monitoring_tasks: Dict[str, asyncio.Task] = {}
    
    async def start_monitoring_server(self):
        """Start the WebSocket monitoring server."""
        logger.info(f"Starting deployment monitoring server on port {self.port}")
        
        self.websocket_server = await websockets.serve(
            self._handle_client_connection,
            "localhost",
            self.port
        )
        
        logger.info(f"Deployment monitor WebSocket server started on ws://localhost:{self.port}")
    
    async def stop_monitoring_server(self):
        """Stop the WebSocket monitoring server."""
        if self.websocket_server:
            self.websocket_server.close()
            await self.websocket_server.wait_closed()
        
        # Cancel all monitoring tasks
        for task in self._monitoring_tasks.values():
            task.cancel()
        
        logger.info("Deployment monitoring server stopped")
    
    async def start_deployment_monitoring(
        self, 
        deployment_id: str,
        services: List[str],
        environment: str
    ):
        """
        Start monitoring a new deployment.
        
        Args:
            deployment_id: Unique identifier for the deployment
            services: List of services being deployed
            environment: Target environment
        """
        logger.info(f"Starting monitoring for deployment {deployment_id}")
        
        # Initialize deployment tracking
        self.active_deployments[deployment_id] = {
            "deployment_id": deployment_id,
            "services": services,
            "environment": environment,
            "status": "in_progress",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "phases": [],
            "current_phase": None
        }
        
        self.metrics_history[deployment_id] = []
        
        # Start monitoring task
        self._monitoring_tasks[deployment_id] = asyncio.create_task(
            self._monitor_deployment_metrics(deployment_id)
        )
        
        # Broadcast deployment started event
        await self._broadcast_update(MonitoringUpdate(
            event_type=MonitoringEvent.DEPLOYMENT_STARTED,
            deployment_id=deployment_id,
            timestamp=datetime.now(timezone.utc),
            data={
                "services": services,
                "environment": environment
            }
        ))
    
    async def update_deployment_status(
        self,
        deployment_id: str,
        status: str,
        phase: Optional[str] = None,
        service_status: Optional[Dict[str, str]] = None
    ):
        """
        Update deployment status and broadcast to clients.
        
        Args:
            deployment_id: Unique identifier for the deployment
            status: New deployment status
            phase: Current deployment phase
            service_status: Status of individual services
        """
        if deployment_id not in self.active_deployments:
            logger.warning(f"Deployment {deployment_id} not found for status update")
            return
        
        deployment = self.active_deployments[deployment_id]
        deployment["status"] = status
        deployment["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        if phase:
            deployment["current_phase"] = phase
            if phase not in [p.get("name") for p in deployment["phases"]]:
                deployment["phases"].append({
                    "name": phase,
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "status": "in_progress"
                })
        
        if service_status:
            deployment["service_status"] = service_status
        
        # Broadcast update
        await self._broadcast_update(MonitoringUpdate(
            event_type=MonitoringEvent.DEPLOYMENT_UPDATED,
            deployment_id=deployment_id,
            timestamp=datetime.now(timezone.utc),
            data={
                "status": status,
                "phase": phase,
                "service_status": service_status
            }
        ))
        
        # Handle completion
        if status in ["success", "failed", "rolled_back"]:
            await self._complete_deployment_monitoring(deployment_id, status)
    
    async def add_health_check_result(
        self,
        deployment_id: str,
        service: str,
        health_status: str,
        details: Dict[str, Any],
        response_time_ms: float
    ):
        """
        Add health check result to monitoring data.
        
        Args:
            deployment_id: Unique identifier for the deployment
            service: Service that was checked
            health_status: Health check result
            details: Health check details
            response_time_ms: Response time in milliseconds
        """
        # Broadcast health check result
        await self._broadcast_update(MonitoringUpdate(
            event_type=MonitoringEvent.HEALTH_CHECK_RESULT,
            deployment_id=deployment_id,
            timestamp=datetime.now(timezone.utc),
            data={
                "service": service,
                "health_status": health_status,
                "details": details,
                "response_time_ms": response_time_ms
            }
        ))
    
    async def get_deployment_status(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current deployment status and metrics.
        
        Args:
            deployment_id: Unique identifier for the deployment
            
        Returns:
            Deployment status dictionary or None if not found
        """
        if deployment_id not in self.active_deployments:
            return None
        
        deployment = self.active_deployments[deployment_id].copy()
        
        # Add latest metrics
        if deployment_id in self.metrics_history and self.metrics_history[deployment_id]:
            latest_metrics = self.metrics_history[deployment_id][-1]
            deployment["latest_metrics"] = asdict(latest_metrics)
        
        return deployment
    
    async def get_deployment_metrics(
        self,
        deployment_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get deployment metrics history.
        
        Args:
            deployment_id: Unique identifier for the deployment
            limit: Maximum number of metrics to return
            
        Returns:
            List of metrics dictionaries
        """
        if deployment_id not in self.metrics_history:
            return []
        
        metrics = self.metrics_history[deployment_id][-limit:]
        return [asdict(metric) for metric in metrics]
    
    async def _handle_client_connection(self, websocket, path):
        """
        Handle new WebSocket client connection.
        
        Args:
            websocket: WebSocket connection
            path: Connection path
        """
        logger.info(f"New WebSocket client connected: {websocket.remote_address}")
        self.connected_clients.add(websocket)
        
        try:
            # Send current deployment statuses to new client
            for deployment_id, deployment in self.active_deployments.items():
                await websocket.send(json.dumps({
                    "type": "deployment_status",
                    "data": deployment
                }))
            
            # Keep connection alive
            async for message in websocket:
                # Handle client messages if needed
                try:
                    data = json.loads(message)
                    logger.info(f"Received client message: {data}")
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from client: {message}")
        
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket client disconnected: {websocket.remote_address}")
        finally:
            self.connected_clients.discard(websocket)
    
    async def _broadcast_update(self, update: MonitoringUpdate):
        """
        Broadcast update to all connected WebSocket clients.
        
        Args:
            update: Monitoring update to broadcast
        """
        if not self.connected_clients:
            return
        
        message = json.dumps({
            "type": update.event_type.value,
            "deployment_id": update.deployment_id,
            "timestamp": update.timestamp.isoformat(),
            "data": update.data,
            "source": update.source
        })
        
        # Send to all connected clients
        disconnected_clients = set()
        for client in self.connected_clients:
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
        
        # Remove disconnected clients
        self.connected_clients -= disconnected_clients
    
    async def _monitor_deployment_metrics(self, deployment_id: str):
        """
        Monitor deployment metrics in background.
        
        Args:
            deployment_id: Unique identifier for the deployment
        """
        logger.info(f"Started metrics monitoring for deployment {deployment_id}")
        
        try:
            while deployment_id in self.active_deployments:
                deployment = self.active_deployments[deployment_id]
                
                if deployment["status"] in ["success", "failed", "rolled_back"]:
                    break
                
                # Collect system metrics
                metrics = DeploymentMetrics(
                    deployment_id=deployment_id,
                    timestamp=datetime.now(timezone.utc),
                    phase=deployment.get("current_phase", "unknown"),
                    cpu_usage=psutil.cpu_percent(interval=1),
                    memory_usage_mb=psutil.virtual_memory().used / 1024 / 1024,
                    disk_usage_mb=psutil.disk_usage('/').used / 1024 / 1024,
                    network_io_mb=sum(psutil.net_io_counters()[:2]) / 1024 / 1024,
                    response_time_ms=0.0,  # Will be updated by health checks
                    active_connections=len(self.connected_clients)
                )
                
                # Store metrics
                self.metrics_history[deployment_id].append(metrics)
                
                # Limit history size
                if len(self.metrics_history[deployment_id]) > self.max_metrics_history:
                    self.metrics_history[deployment_id] = \
                        self.metrics_history[deployment_id][-self.max_metrics_history:]
                
                # Broadcast metrics
                await self._broadcast_update(MonitoringUpdate(
                    event_type=MonitoringEvent.PERFORMANCE_METRIC,
                    deployment_id=deployment_id,
                    timestamp=datetime.now(timezone.utc),
                    data=asdict(metrics)
                ))
                
                await asyncio.sleep(self.metrics_interval)
        
        except asyncio.CancelledError:
            logger.info(f"Metrics monitoring cancelled for deployment {deployment_id}")
        except Exception as e:
            logger.error(f"Error in metrics monitoring for {deployment_id}: {e}")
    
    async def _complete_deployment_monitoring(self, deployment_id: str, final_status: str):
        """
        Complete deployment monitoring and cleanup.
        
        Args:
            deployment_id: Unique identifier for the deployment
            final_status: Final deployment status
        """
        if deployment_id in self.active_deployments:
            deployment = self.active_deployments[deployment_id]
            deployment["status"] = final_status
            deployment["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Cancel monitoring task
        if deployment_id in self._monitoring_tasks:
            self._monitoring_tasks[deployment_id].cancel()
            del self._monitoring_tasks[deployment_id]
        
        # Broadcast completion
        event_type = {
            "success": MonitoringEvent.DEPLOYMENT_COMPLETED,
            "failed": MonitoringEvent.DEPLOYMENT_FAILED,
            "rolled_back": MonitoringEvent.DEPLOYMENT_FAILED
        }.get(final_status, MonitoringEvent.DEPLOYMENT_COMPLETED)
        
        await self._broadcast_update(MonitoringUpdate(
            event_type=event_type,
            deployment_id=deployment_id,
            timestamp=datetime.now(timezone.utc),
            data={"final_status": final_status}
        ))
        
        logger.info(f"Completed monitoring for deployment {deployment_id} with status {final_status}")