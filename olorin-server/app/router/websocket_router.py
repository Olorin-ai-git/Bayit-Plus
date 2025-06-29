from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.service.websocket_manager import websocket_manager

router = APIRouter()


@router.websocket("/ws/{investigation_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    investigation_id: str,
    parallel: bool = Query(
        False,
        description="Whether to run investigation agents in parallel (true) or sequentially (false). Defaults to sequential (step by step).",
    ),
):
    await websocket_manager.connect(websocket, investigation_id, parallel=parallel)
    try:
        while True:
            # Keep the connection alive and wait for client messages
            data = await websocket.receive_text()
            # You can handle any client messages here if needed
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, investigation_id)
