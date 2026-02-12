"""
SyncLabs Lip-Sync Service.

Generates real-time blend shape weights from audio + 3D mesh via SyncLabs API.
Supports both batch (REST) and streaming (WebSocket) modes for client-side
3D avatar rendering with time-stamped viseme data.
"""

import base64
import json
from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class SyncLabsLipsyncService:
    """SyncLabs API integration for real-time lip-sync blend shapes."""

    async def generate_realtime_lipsync(
        self,
        mesh_glb_url: str,
        audio_gcs_path: str,
    ) -> dict:
        """
        Generate time-stamped blend shape weights from mesh + audio.

        POSTs to SyncLabs REST API with the mesh GLB URL and audio,
        returns blend shape weight keyframes for client-side 3D rendering.
        """
        from app.services.olorin.storage_service import storage_service

        audio_signed_url = await storage_service.generate_signed_url(
            audio_gcs_path, expiry_seconds=3600,
        )

        payload = {
            "mesh_url": mesh_glb_url,
            "audio_url": audio_signed_url,
            "output_format": "blend_shapes",
            "fps": 30,
        }

        timeout = settings.SYNCLABS_TIMEOUT
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{settings.SYNCLABS_BASE_URL}/v1/lipsync",
                headers={
                    "Authorization": f"Bearer {settings.SYNCLABS_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            result = response.json()

        frame_count = len(result.get("frames", []))
        logger.info(
            "SyncLabs lipsync generated",
            extra={
                "frame_count": frame_count,
                "duration_seconds": result.get("duration_seconds", 0),
                "credits_charged": settings.CREDIT_RATE_SYNCLABS_LIPSYNC,
            },
        )

        return {
            "frames": result.get("frames", []),
            "duration_seconds": result.get("duration_seconds", 0),
            "fps": result.get("fps", 30),
            "blend_shape_names": result.get("blend_shape_names", []),
            "credits_charged": settings.CREDIT_RATE_SYNCLABS_LIPSYNC,
        }

    async def stream_lipsync_websocket(
        self,
        websocket,
        mesh_glb_url: str,
    ) -> None:
        """
        Bidirectional streaming lip-sync via SyncLabs WebSocket.

        Receives audio chunks from the client, forwards to SyncLabs,
        and relays blend shape weight frames back to the client in
        real time for 3D avatar animation.
        """
        import asyncio

        ws_url = (
            f"{settings.SYNCLABS_WEBSOCKET_URL}"
            f"?api_key={settings.SYNCLABS_API_KEY}"
            f"&mesh_url={mesh_glb_url}"
        )

        async with httpx.AsyncClient() as http_client:
            synclabs_ws = await self._connect_synclabs_ws(ws_url)
            if not synclabs_ws:
                await websocket.send_json({
                    "type": "error",
                    "message": "Failed to connect to lip-sync service",
                })
                return

            try:
                await asyncio.gather(
                    self._relay_audio_to_synclabs(
                        websocket, synclabs_ws,
                    ),
                    self._relay_blendshapes_to_client(
                        websocket, synclabs_ws,
                    ),
                )
            except Exception as exc:
                logger.error(
                    "SyncLabs WS stream error",
                    extra={"error": str(exc)},
                )
                raise
            finally:
                await synclabs_ws.aclose()

    async def _connect_synclabs_ws(self, ws_url: str) -> Optional[object]:
        """Open a WebSocket connection to SyncLabs streaming endpoint."""
        import websockets

        try:
            connection = await websockets.connect(ws_url)
            logger.info("SyncLabs WebSocket connected")
            return connection
        except Exception as exc:
            logger.error(
                "SyncLabs WS connection failed",
                extra={"error": str(exc)},
            )
            return None

    async def _relay_audio_to_synclabs(self, client_ws, synclabs_ws):
        """Forward audio chunks from client WebSocket to SyncLabs."""
        while True:
            data = await client_ws.receive_text()
            message = json.loads(data)

            if message.get("type") == "audio_chunk":
                audio_b64 = message.get("audio", "")
                await synclabs_ws.send(json.dumps({
                    "type": "audio",
                    "data": audio_b64,
                }))
            elif message.get("type") == "end_stream":
                await synclabs_ws.send(json.dumps({"type": "end"}))
                break

    async def _relay_blendshapes_to_client(self, client_ws, synclabs_ws):
        """Relay blend shape frames from SyncLabs back to the client."""
        async for raw_message in synclabs_ws:
            frame_data = json.loads(raw_message)
            await client_ws.send_json({
                "type": "lipsync_weights",
                "timestamp": frame_data.get("timestamp", 0),
                "weights": frame_data.get("weights", {}),
            })


synclabs_lipsync_service = SyncLabsLipsyncService()
