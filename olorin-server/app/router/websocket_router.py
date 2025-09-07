import json
import logging
import os
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

# WebSocket authentication configuration
WEBSOCKET_AUTH_REQUIRED = os.getenv('WEBSOCKET_AUTH_REQUIRED', 'true').lower() == 'true'
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

async def verify_websocket_token(token: str) -> bool:
    """Verify JWT token for WebSocket connection with local development bypass."""

    # Check if authentication should be bypassed for local development
    if not WEBSOCKET_AUTH_REQUIRED or ENVIRONMENT == 'development':
        logger.info("🔓 WebSocket authentication bypassed for local development")
        return True

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Accept tokens that decode successfully even if 'sub' claim is absent.
        # Many internal tokens use 'user_id' or other claims.
        if payload is None or not isinstance(payload, dict):
            logger.error("❌ WebSocket JWT payload invalid")
            return False
        return True
    except JWTError as e:
        logger.error(f"❌ WebSocket JWT verification failed: {e}")
        return False


@router.websocket("/ws/{investigation_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    investigation_id: str,
    token: str = Query(None if not WEBSOCKET_AUTH_REQUIRED or ENVIRONMENT == 'development' else ..., description="JWT authentication token"),
    parallel: bool = Query(
        False,
        description="Whether to run investigation agents in parallel (true) or sequentially (false). Defaults to sequential (step by step).",
    ),
):
    # Verify token before accepting WebSocket connection (with bypass for local development)
    if not await verify_websocket_token(token):
        logger.error("❌ WebSocket authentication failed - closing connection")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    logger.info(f"✅ WebSocket connection established for investigation: {investigation_id}")
    await websocket_manager.connect(websocket, investigation_id, parallel=parallel)
    try:
        while True:
            # Keep the connection alive and wait for client messages
            data = await websocket.receive_text()
            # You can handle any client messages here if needed
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for investigation: {investigation_id}")
        websocket_manager.disconnect(websocket, investigation_id)


@router.websocket("/ws/rag/{investigation_id}")
async def rag_websocket_endpoint(
    websocket: WebSocket,
    investigation_id: str,
    token: str = Query(None if not WEBSOCKET_AUTH_REQUIRED or ENVIRONMENT == 'development' else ..., description="JWT authentication token"),
):
    """WebSocket endpoint for RAG (Retrieval-Augmented Generation) events"""
    # Verify token before accepting WebSocket connection (with bypass for local development)
    if not await verify_websocket_token(token):
        logger.error("❌ RAG WebSocket authentication failed - closing connection")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    logger.info(f"✅ RAG WebSocket connection established for investigation: {investigation_id}")
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
        logger.info(f"RAG WebSocket disconnected for investigation: {investigation_id}")
        rag_websocket_manager.disconnect(websocket, investigation_id)