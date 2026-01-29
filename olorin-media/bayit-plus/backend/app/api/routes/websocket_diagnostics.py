"""
WebSocket Diagnostics Endpoint
Real-time system health monitoring for admin dashboard
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from starlette.websockets import WebSocketState

from app.core.config import settings
from app.core.health_checks import (check_elevenlabs_health, check_gcs_health,
                                    check_mongodb_health, check_openai_health,
                                    check_pinecone_health, check_sentry_health)
from app.models.diagnostics import ClientHeartbeat, ClientStatus
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate JWT token and return user."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None

        user = await User.get(user_id)
        if user is None or not user.is_active:
            return None

        return user
    except JWTError:
        return None


class DiagnosticsConnectionManager:
    """Manage WebSocket connections for diagnostics dashboard."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_ids: Dict[str, str] = {}  # websocket id -> user id

    async def connect(self, websocket: WebSocket, user_id: str) -> str:
        """Accept new WebSocket connection."""
        await websocket.accept()
        connection_id = id(websocket)
        self.active_connections[str(connection_id)] = websocket
        self.user_ids[str(connection_id)] = user_id
        logger.info(f"Diagnostics connection established: {connection_id} for user {user_id}")
        return str(connection_id)

    async def disconnect(self, connection_id: str):
        """Remove WebSocket connection."""
        if connection_id in self.active_connections:
            websocket = self.active_connections.pop(connection_id)
            user_id = self.user_ids.pop(connection_id, None)
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.close()
            except Exception as e:
                logger.warning(f"Error closing websocket {connection_id}: {e}")
            logger.info(f"Diagnostics connection closed: {connection_id} for user {user_id}")

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        disconnected = []
        for connection_id, websocket in list(self.active_connections.items()):
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json(message)
                else:
                    disconnected.append(connection_id)
            except Exception as e:
                logger.warning(f"Error broadcasting to {connection_id}: {e}")
                disconnected.append(connection_id)

        # Clean up disconnected connections
        for connection_id in disconnected:
            await self.disconnect(connection_id)


# Global connection manager
diagnostics_manager = DiagnosticsConnectionManager()


@router.websocket("/ws/admin/diagnostics")
async def diagnostics_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time diagnostics updates.

    Requires admin or super_admin role.
    Broadcasts system health updates every 5 seconds.
    """
    # Extract token from query parameters
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
        return

    # Authenticate user
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
        return

    # Check permissions
    if user.role not in ["super_admin", "admin"]:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Admin access required")
        return

    # Connect
    connection_id = await diagnostics_manager.connect(websocket, str(user.id))

    try:
        # Send initial snapshot
        await send_diagnostics_snapshot(websocket)

        # Start broadcast task
        broadcast_task = asyncio.create_task(
            broadcast_diagnostics_updates(connection_id)
        )

        # Message loop (for client commands)
        while True:
            try:
                data = await websocket.receive_json()
                await handle_diagnostics_command(data, websocket, connection_id)
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from diagnostics connection {connection_id}")
                continue

    except Exception as e:
        logger.error(f"Error in diagnostics WebSocket: {e}")
    finally:
        # Cancel broadcast task
        if 'broadcast_task' in locals():
            broadcast_task.cancel()
            try:
                await broadcast_task
            except asyncio.CancelledError:
                pass

        # Disconnect
        await diagnostics_manager.disconnect(connection_id)


async def send_diagnostics_snapshot(websocket: WebSocket):
    """Send current diagnostics state to newly connected client."""
    try:
        # Get backend services health
        services_health = await get_backend_services_health()

        # Get client statuses
        client_statuses = await get_client_statuses()

        # Send snapshot
        await websocket.send_json({
            "type": "snapshot",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {
                "services": services_health,
                "clients": client_statuses,
            }
        })
    except Exception as e:
        logger.error(f"Error sending diagnostics snapshot: {e}")


async def broadcast_diagnostics_updates(connection_id: str):
    """Broadcast diagnostics updates periodically."""
    while True:
        try:
            # Wait for broadcast interval
            await asyncio.sleep(5.0)  # 5 second updates

            # Get latest data
            services_health = await get_backend_services_health()
            client_statuses = await get_client_statuses()

            # Broadcast to all connected clients
            await diagnostics_manager.broadcast({
                "type": "update",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "services": services_health,
                    "clients": client_statuses,
                }
            })

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error broadcasting diagnostics: {e}")
            await asyncio.sleep(1.0)  # Brief pause before retry


async def handle_diagnostics_command(data: dict, websocket: WebSocket, connection_id: str):
    """Handle command from diagnostics dashboard client."""
    command = data.get("command")

    if command == "ping":
        # Send pong response
        await websocket.send_json({
            "type": "pong",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    elif command == "refresh":
        # Send immediate snapshot
        await send_diagnostics_snapshot(websocket)

    else:
        logger.warning(f"Unknown diagnostics command from {connection_id}: {command}")


async def get_backend_services_health() -> dict:
    """Get current health of all backend services."""
    # Run all health checks concurrently
    health_checks = await asyncio.gather(
        check_mongodb_health(),
        check_gcs_health(),
        check_pinecone_health(),
        check_openai_health(),
        check_sentry_health(),
        check_elevenlabs_health(),
        return_exceptions=True
    )

    services = {}
    for check in health_checks:
        if hasattr(check, 'name'):
            services[check.name] = {
                "status": check.status.value if hasattr(check.status, 'value') else str(check.status),
                "latency_ms": check.latency_ms,
                "message": check.message,
            }
        elif isinstance(check, Exception):
            logger.error(f"Health check failed: {check}")

    return services


async def get_client_statuses() -> dict:
    """Get current status of all clients."""
    # Get recent heartbeats (within last 5 minutes)
    cutoff_time = datetime.now(timezone.utc) - timedelta(
        seconds=settings.DIAGNOSTICS_CLIENT_TIMEOUT_SECONDS
    )

    heartbeats = await ClientHeartbeat.find(
        ClientHeartbeat.last_seen >= cutoff_time
    ).to_list()

    # Mark stale clients as offline
    await mark_stale_clients_offline(cutoff_time)

    # Group by client type
    clients_by_type = {}
    for heartbeat in heartbeats:
        client_type = heartbeat.client_type.value
        if client_type not in clients_by_type:
            clients_by_type[client_type] = []

        clients_by_type[client_type].append({
            "client_id": heartbeat.client_id,
            "status": heartbeat.status.value,
            "last_seen": heartbeat.last_seen.isoformat(),
            "metrics": heartbeat.metrics.model_dump() if hasattr(heartbeat.metrics, 'model_dump') else heartbeat.metrics,
            "api_latency": heartbeat.api_latency,
        })

    return clients_by_type


async def mark_stale_clients_offline(cutoff_time: datetime):
    """Mark clients that haven't sent heartbeat recently as offline."""
    stale_clients = await ClientHeartbeat.find(
        ClientHeartbeat.last_seen < cutoff_time,
        ClientHeartbeat.status != ClientStatus.OFFLINE
    ).to_list()

    for client in stale_clients:
        client.status = ClientStatus.OFFLINE
        await client.save()
