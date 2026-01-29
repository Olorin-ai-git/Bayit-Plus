"""
TTS WebSocket Stream Handler

Encapsulates the ElevenLabs TTS WebSocket protocol:
connect -> init message -> send text -> receive audio chunks -> close.

Extracted from pipeline.py for single-responsibility (Code Review #1).
Includes receive timeout (Security #8) and PCM output (Voice Tech #11).
"""

import asyncio
import base64
import json
import logging
import time
from dataclasses import dataclass, field
from typing import List, Optional

from app.core.config import settings
from app.services.olorin.dubbing.tts_connection_pool import get_tts_pool
from app.services.olorin.dubbing.voice_settings import VoiceSettings

logger = logging.getLogger(__name__)


@dataclass
class TTSResult:
    """Result from a TTS stream operation."""

    audio_chunks: List[bytes] = field(default_factory=list)
    first_audio_time_ms: Optional[float] = None
    total_audio_bytes: int = 0
    error: Optional[str] = None


async def stream_tts(
    text: str,
    voice_id: str,
    voice_settings: Optional[VoiceSettings] = None,
) -> TTSResult:
    """
    Stream text-to-speech via ElevenLabs WebSocket protocol.

    Acquires a connection from the pool, sends text, collects PCM audio
    chunks, and releases the connection.

    Args:
        text: Text to synthesize
        voice_id: ElevenLabs voice ID
        voice_settings: Optional per-session voice customization (P3-2)

    Returns:
        TTSResult with collected audio chunks
    """
    pool = get_tts_pool()
    ws = None
    result = TTSResult()

    try:
        ws = await pool.acquire(voice_id=voice_id)

        # P3-2: Apply per-session voice settings
        effective_settings = voice_settings or VoiceSettings()
        tts_voice_settings = effective_settings.to_elevenlabs_dict()

        # Voice Tech #15: Optimized chunk_length_schedule for real-time
        dubbing_config = settings.olorin.dubbing
        init_message = {
            "text": " ",
            "voice_settings": tts_voice_settings,
            "generation_config": {
                "chunk_length_schedule": [
                    int(dubbing_config.tts_chunk_schedule_1),
                    int(dubbing_config.tts_chunk_schedule_2),
                    int(dubbing_config.tts_chunk_schedule_3),
                ],
            },
            "xi_api_key": settings.ELEVENLABS_API_KEY,
        }
        await ws.send(json.dumps(init_message))

        # Send text for synthesis
        text_message = {
            "text": text,
            "try_trigger_generation": True,
            "flush": True,
        }
        await ws.send(json.dumps(text_message))

        # Signal end of text input
        await ws.send(json.dumps({"text": "", "flush": True}))

        # Security #8: Receive audio with per-message timeout
        receive_timeout = dubbing_config.tts_receive_timeout_seconds

        while True:
            try:
                raw_message = await asyncio.wait_for(
                    ws.recv(),
                    timeout=receive_timeout,
                )
            except asyncio.TimeoutError:
                result.error = "TTS receive timeout"
                logger.warning(
                    f"TTS receive timeout after {receive_timeout}s"
                )
                break

            data = json.loads(raw_message)

            if "error" in data:
                result.error = data.get("error", "Unknown TTS error")
                break

            if "audio" in data and data["audio"]:
                audio_bytes = base64.b64decode(data["audio"])
                result.audio_chunks.append(audio_bytes)
                result.total_audio_bytes += len(audio_bytes)

                if result.first_audio_time_ms is None:
                    result.first_audio_time_ms = time.time() * 1000

            if data.get("isFinal"):
                break

        # Release connection back to pool
        await pool.release(ws)
        ws = None

    except Exception as e:
        result.error = str(e)
        logger.error(f"TTS stream error: {e}")
    finally:
        if ws:
            try:
                await pool.release(ws)
            except Exception:
                pass

    return result
