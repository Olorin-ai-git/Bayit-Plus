import json
from enum import Enum
from typing import Any, Dict, Optional, Set

from fastapi import WebSocket


class AgentPhase(Enum):
    INITIALIZATION = "initialization"
    LOCATION_ANALYSIS = "location_analysis"
    NETWORK_ANALYSIS = "network_analysis"
    DEVICE_ANALYSIS = "device_analysis"
    BEHAVIOR_ANALYSIS = "behavior_analysis"
    ANOMALY_DETECTION = "anomaly_detection"
    RISK_ASSESSMENT = "risk_assessment"
    COMPLETED = "completed"


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.investigation_settings: Dict[str, Dict[str, Any]] = {}

    async def connect(
        self, websocket: WebSocket, investigation_id: str, parallel: bool = False
    ):
        await websocket.accept()
        if investigation_id not in self.active_connections:
            self.active_connections[investigation_id] = set()
        self.active_connections[investigation_id].add(websocket)

        # Store investigation settings
        if investigation_id not in self.investigation_settings:
            self.investigation_settings[investigation_id] = {}
        self.investigation_settings[investigation_id]["parallel"] = parallel

    def disconnect(self, websocket: WebSocket, investigation_id: str):
        if investigation_id in self.active_connections:
            self.active_connections[investigation_id].remove(websocket)
            if not self.active_connections[investigation_id]:
                del self.active_connections[investigation_id]
                # Clean up investigation settings when no connections remain
                if investigation_id in self.investigation_settings:
                    del self.investigation_settings[investigation_id]

    def get_investigation_parallel_setting(self, investigation_id: str) -> bool:
        """Get the parallel setting for an investigation. Defaults to False (sequential) if not found."""
        return self.investigation_settings.get(investigation_id, {}).get(
            "parallel", False
        )

    async def broadcast_progress(
        self,
        investigation_id: str,
        phase: AgentPhase,
        progress: float,
        message: str = None,
        data: Optional[Dict[str, Any]] = None,
    ):
        if investigation_id in self.active_connections:
            payload = {
                "phase": phase.value,
                "progress": progress,
                "message": message,
                "data": data,
            }
            for connection in self.active_connections[investigation_id]:
                try:
                    await connection.send_json(payload)
                except Exception:
                    # Handle disconnected clients
                    self.disconnect(connection, investigation_id)

    async def broadcast_agent_result(
        self,
        investigation_id: str,
        phase: AgentPhase,
        agent_response: Dict[str, Any],
        message: str = None,
    ):
        """Broadcast the complete agent API response as progress update."""
        if investigation_id in self.active_connections:
            payload = {
                "phase": phase.value,
                "progress": 1.0,  # Agent completed
                "message": message
                or f"{phase.value.replace('_', ' ').title()} completed",
                "agent_response": agent_response,
                "timestamp": agent_response.get("timestamp")
                or json.dumps({"timestamp": "now"}),
            }
            for connection in self.active_connections[investigation_id]:
                try:
                    await connection.send_json(payload)
                except Exception:
                    # Handle disconnected clients
                    self.disconnect(connection, investigation_id)


# Create a singleton instance
websocket_manager = WebSocketManager()
