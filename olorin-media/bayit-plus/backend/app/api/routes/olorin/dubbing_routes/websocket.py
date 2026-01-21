"""
Dubbing WebSocket Endpoint

Real-time audio streaming via WebSocket.
"""

import asyncio
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.routes.olorin.dubbing_routes import state
from app.services.olorin.partner_service import partner_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/{session_id}")
async def websocket_dubbing(
    websocket: WebSocket,
    session_id: str,
    api_key: str = Query(..., alias="api_key"),
):
    """
    WebSocket endpoint for real-time audio dubbing.

    Protocol:
    - Client sends: Binary audio (16kHz, mono, LINEAR16 PCM)
    - Server sends JSON messages:
      - {"type": "transcript", "original_text": "...", "source_language": "he"}
      - {"type": "translation", "original_text": "...", "translated_text": "...", "latency_ms": 123}
      - {"type": "dubbed_audio", "data": "<base64>", ...}
      - {"type": "error", "message": "..."}
      - {"type": "session_started", "session_id": "..."}
      - {"type": "session_ended", "session_id": "..."}
    """
    partner = await partner_service.authenticate_by_api_key(api_key)
    if not partner:
        await websocket.close(code=4001, reason="Invalid API key")
        return

    if not partner.has_capability("realtime_dubbing"):
        await websocket.close(code=4003, reason="Dubbing capability not enabled")
        return

    service = state.get_service(session_id)
    if not service:
        await websocket.close(code=4004, reason="Session not found")
        return

    if service.partner.partner_id != partner.partner_id:
        await websocket.close(code=4003, reason="Session belongs to different partner")
        return

    await websocket.accept()
    logger.info(f"WebSocket connected for dubbing session: {session_id}")

    try:
        await service.start()

        async def receive_audio():
            """Receive audio from client."""
            try:
                while True:
                    data = await websocket.receive()
                    if "bytes" in data:
                        await service.process_audio_chunk(data["bytes"])
                    elif "text" in data:
                        logger.debug(f"Received text message: {data['text']}")
            except WebSocketDisconnect:
                logger.info(f"Client disconnected from dubbing session: {session_id}")
            except Exception as e:
                logger.error(f"Error receiving audio: {e}")

        async def send_messages():
            """Send dubbing messages to client."""
            try:
                async for message in service.receive_messages():
                    await websocket.send_json(message.to_dict())
            except WebSocketDisconnect:
                pass
            except Exception as e:
                logger.error(f"Error sending messages: {e}")

        receive_task = asyncio.create_task(receive_audio())
        send_task = asyncio.create_task(send_messages())

        done, pending = await asyncio.wait(
            [receive_task, send_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        logger.error(f"WebSocket error in dubbing session {session_id}: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass

    finally:
        if service.is_running:
            await service.stop()

        state.remove_service(session_id)

        try:
            await websocket.close()
        except Exception:
            pass

        logger.info(f"Dubbing session ended: {session_id}")
