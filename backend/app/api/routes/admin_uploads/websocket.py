"""
WebSocket endpoint for real-time upload progress updates.
"""

import asyncio
import json
import logging
from typing import List

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.routes.admin_uploads.dependencies import job_to_response
from app.core.security import decode_token
from app.services.upload_service import upload_service

router = APIRouter()
logger = logging.getLogger(__name__)


class UploadWebSocketManager:
    """Manages WebSocket connections for upload progress updates."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Add a WebSocket connection to the manager."""
        # Note: websocket should already be accepted before calling this
        self.active_connections.append(websocket)
        logger.info(
            f"WebSocket connected. Total connections: {len(self.active_connections)}"
        )

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection from the manager."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            f"WebSocket disconnected. Total connections: {len(self.active_connections)}"
        )

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message: {e}")
                disconnected.append(connection)

        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


# Global WebSocket manager instance
ws_manager = UploadWebSocketManager()

# Set the callback for upload service
upload_service.set_websocket_callback(ws_manager.broadcast)


@router.websocket("/uploads/ws")
async def upload_websocket(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for real-time upload progress updates.

    Clients receive messages:
    - {"type": "queue_update", "stats": {...}, "active_job": {...}, "queue": [...], "recent_completed": [...]}
    - {"type": "connected", "message": "..."}
    - {"type": "error", "message": "..."}

    Clients can send:
    - {"type": "ping"}
    """
    # Authenticate user BEFORE accepting connection
    try:
        payload = decode_token(token)
        if not payload or not payload.get("sub"):
            # Must accept before closing
            await websocket.accept()
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        # Must accept before closing
        await websocket.accept()
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Accept the WebSocket connection
    await websocket.accept()

    # Connect to manager
    await ws_manager.connect(websocket)

    try:
        # Send initial connection message
        await websocket.send_json(
            {"type": "connected", "message": "Connected to upload service"}
        )

        # Send initial queue state
        stats = await upload_service.get_queue_stats()
        active_job = await upload_service.get_active_job()
        queue = await upload_service.get_queue()
        recent = await upload_service.get_recent_completed(5)

        await websocket.send_json(
            {
                "type": "queue_update",
                "stats": stats.model_dump(mode="json"),
                "active_job": (
                    job_to_response(active_job).model_dump(mode="json")
                    if active_job
                    else None
                ),
                "queue": [job_to_response(j).model_dump(mode="json") for j in queue],
                "recent_completed": [
                    job_to_response(j).model_dump(mode="json") for j in recent
                ],
            }
        )

        # Message loop
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "ping":
                    await websocket.send_json(
                        {"type": "pong", "timestamp": asyncio.get_event_loop().time()}
                    )

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        ws_manager.disconnect(websocket)
