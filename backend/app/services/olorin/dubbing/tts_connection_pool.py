"""
TTS WebSocket Connection Pool (P1-1)

Manages reusable WebSocket connections to ElevenLabs TTS.
Reduces per-segment latency by 50-150ms by avoiding reconnection overhead.
"""

import asyncio
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import websockets
    from websockets import ClientConnection

    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    ClientConnection = None  # type: ignore

ELEVENLABS_TTS_WS_URL = "wss://api.elevenlabs.io/v1/text-to-speech"


class TTSConnectionPool:
    """
    Pool of reusable WebSocket connections to ElevenLabs TTS API.

    Connections are voice-specific. The pool manages creation, health
    checking, and cleanup of WebSocket connections.
    """

    def __init__(self, api_key: str):
        if not WEBSOCKETS_AVAILABLE:
            raise ImportError(
                "websockets library required for TTS pool"
            )
        self._api_key = api_key
        max_conns = settings.olorin.dubbing.tts_connection_pool_size
        self._pool: asyncio.Queue[ClientConnection] = asyncio.Queue(
            maxsize=max_conns
        )
        self._max_connections = max_conns
        self._created = 0
        self._lock = asyncio.Lock()

    async def acquire(
        self,
        voice_id: str,
        model_id: str = "eleven_turbo_v2_5",
        output_format: str = "pcm_16000",
    ) -> ClientConnection:
        """
        Get or create a WebSocket connection.

        Tries to reuse an existing connection from the pool.
        If pool is empty and under limit, creates a new connection.
        If at limit, waits for a connection to be released.
        """
        # Try to get an existing connection (non-blocking)
        try:
            ws = self._pool.get_nowait()
            if await self._is_healthy(ws):
                return ws
            # Connection is stale, close and create new
            await self._close_connection(ws)
        except asyncio.QueueEmpty:
            pass

        # Create new connection if under limit
        async with self._lock:
            if self._created < self._max_connections:
                ws = await self._create_connection(
                    voice_id, model_id, output_format
                )
                self._created += 1
                return ws

        # At limit - wait for a released connection
        ws = await self._pool.get()
        if await self._is_healthy(ws):
            return ws

        # Stale connection - replace
        await self._close_connection(ws)
        return await self._create_connection(
            voice_id, model_id, output_format
        )

    async def release(self, ws: ClientConnection) -> None:
        """Return a connection to the pool (or discard if unhealthy)."""
        if await self._is_healthy(ws):
            try:
                self._pool.put_nowait(ws)
                return
            except asyncio.QueueFull:
                pass

        await self._close_connection(ws)

    async def close_all(self) -> None:
        """Drain and close all pooled connections."""
        while not self._pool.empty():
            try:
                ws = self._pool.get_nowait()
                await self._close_connection(ws)
            except asyncio.QueueEmpty:
                break
        async with self._lock:
            self._created = 0
        logger.info("TTS connection pool drained")

    async def _create_connection(
        self,
        voice_id: str,
        model_id: str,
        output_format: str,
    ) -> ClientConnection:
        """Create a new WebSocket connection to ElevenLabs TTS."""
        ws_url = (
            f"{ELEVENLABS_TTS_WS_URL}/{voice_id}/stream-input"
            f"?model_id={model_id}&output_format={output_format}"
        )
        ws = await websockets.connect(
            ws_url,
            additional_headers={"xi-api-key": self._api_key},
            ping_interval=20,
            ping_timeout=30,
            close_timeout=10,
        )
        logger.debug(
            f"TTS pool: created connection (total: {self._created + 1})"
        )
        return ws

    async def _is_healthy(self, ws: ClientConnection) -> bool:
        """Check if a WebSocket connection is still open."""
        try:
            return ws.state.name == "OPEN"
        except Exception:
            return False

    async def _close_connection(self, ws: ClientConnection) -> None:
        """Close a WebSocket connection safely."""
        try:
            await ws.close()
        except Exception as e:
            logger.debug(f"Error closing pooled TTS connection: {e}")
        async with self._lock:
            self._created = max(0, self._created - 1)

    @property
    def pool_size(self) -> int:
        """Current number of idle connections in the pool."""
        return self._pool.qsize()

    @property
    def total_created(self) -> int:
        """Total connections created (including in-use)."""
        return self._created


# Module-level singleton
_tts_pool: Optional[TTSConnectionPool] = None


def get_tts_pool() -> TTSConnectionPool:
    """Get or create the global TTS connection pool."""
    global _tts_pool
    if _tts_pool is None:
        _tts_pool = TTSConnectionPool(
            api_key=settings.ELEVENLABS_API_KEY,
        )
    return _tts_pool


async def close_tts_pool() -> None:
    """Close the global TTS connection pool."""
    global _tts_pool
    if _tts_pool:
        await _tts_pool.close_all()
        _tts_pool = None
