import json
import logging
from app.service.logging import get_bridge_logger

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from jose import JWTError, jwt

from app.security.auth import ALGORITHM, SECRET_KEY
from app.service.websocket_manager import websocket_manager
from app.service.rag_websocket_manager import rag_websocket_manager

logger = get_bridge_logger(__name__)

router = APIRouter()


async def verify_websocket_token(token: str) -> bool:
    """Verify JWT token for WebSocket connection."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return False
        # Token is valid
        return True
    except JWTError:
        return False


@router.websocket("/ws/{investigation_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    investigation_id: str,
    token: str = Query(..., description="JWT authentication token"),
    parallel: bool = Query(
        False,
        description="Whether to run investigation agents in parallel (true) or sequentially (false). Defaults to sequential (step by step).",
    ),
):
    # Verify token before accepting WebSocket connection
    if not await verify_websocket_token(token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket_manager.connect(websocket, investigation_id, parallel=parallel)
    try:
        while True:
            # Keep the connection alive and wait for client messages
            data = await websocket.receive_text()
            # You can handle any client messages here if needed
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, investigation_id)


@router.websocket("/ws/rag/{investigation_id}")
async def rag_websocket_endpoint(
    websocket: WebSocket,
    investigation_id: str,
    token: str = Query(..., description="JWT authentication token"),
):
    """WebSocket endpoint for RAG (Retrieval-Augmented Generation) events"""
    # Verify token before accepting WebSocket connection
    if not await verify_websocket_token(token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await rag_websocket_manager.connect(websocket, investigation_id)
    try:
        while True:
            # Keep the connection alive and wait for client messages
            data = await websocket.receive_text()
            # Handle client messages if needed (e.g., configuration changes)
            try:
                message = json.loads(data) if data else {}
                logger.debug(f"RAG WebSocket received message: {message}")
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from RAG WebSocket client: {data}")
    except WebSocketDisconnect:
        rag_websocket_manager.disconnect(websocket, investigation_id)
