"""
WebSocket Handler for Autonomous Investigations
This module handles real-time monitoring of autonomous investigations via WebSocket connections.
"""
import asyncio
import json
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

from app.service.agent.journey_tracker import journey_tracker
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Global tracking of WebSocket connections
websocket_connections: Dict[str, WebSocket] = {}


async def monitor_investigation_websocket(websocket: WebSocket, investigation_id: str, active_investigations: Dict[str, Dict[str, Any]]):
    """
    WebSocket endpoint for real-time investigation monitoring.
    
    Provides live updates of investigation progress, agent activities, and findings.
    """
    await websocket.accept()
    websocket_connections[investigation_id] = websocket
    
    try:
        # Send initial status
        if investigation_id in active_investigations:
            initial_status = {
                "type": "status_update",
                "data": active_investigations[investigation_id]
            }
            await websocket.send_text(json.dumps(initial_status))
        
        # Keep connection alive and send updates
        while True:
            # Check if investigation is still active
            if investigation_id not in active_investigations:
                break
                
            # Send periodic status updates
            try:
                status_update = {
                    "type": "status_update",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "data": active_investigations[investigation_id]
                }
                await websocket.send_text(json.dumps(status_update))
                
                # Send journey updates if available
                journey_status = journey_tracker.get_journey_status(investigation_id)
                if not journey_status.get("error"):
                    journey_update = {
                        "type": "journey_update",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "data": journey_status
                    }
                    await websocket.send_text(json.dumps(journey_update))
                
                await asyncio.sleep(2)  # Update every 2 seconds
                
            except Exception as e:
                logger.warning(f"WebSocket update failed: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for investigation: {investigation_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if investigation_id in websocket_connections:
            del websocket_connections[investigation_id]


async def notify_websocket_connections(investigation_id: str, message: Dict[str, Any]):
    """Notify WebSocket connections of investigation updates"""
    
    if investigation_id in websocket_connections:
        try:
            websocket = websocket_connections[investigation_id]
            await websocket.send_text(json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **message
            }))
        except Exception as e:
            logger.warning(f"Failed to send WebSocket update: {e}")


def get_websocket_connections() -> Dict[str, WebSocket]:
    """Get current WebSocket connections (for testing and monitoring)"""
    return websocket_connections.copy()