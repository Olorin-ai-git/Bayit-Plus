"""
Stream Audio Capture - Backend-side audio extraction from HLS streams

Uses FFmpeg to extract audio from live HLS streams in real-time.
Outputs 16kHz mono PCM audio chunks for STT processing.

This solves the CORS limitation where browsers cannot capture audio
from cross-origin video elements.
"""

import asyncio
import subprocess
from typing import AsyncIterator, Optional

from app.core.logging_config import get_logger
from app.services.live_dubbing.ffmpeg_validator import FFmpegInputValidator

logger = get_logger(__name__)

# Audio configuration for STT (ElevenLabs Scribe requirements)
SAMPLE_RATE = 16000  # 16kHz
CHANNELS = 1  # Mono
SAMPLE_FORMAT = "s16le"  # Signed 16-bit little-endian PCM
CHUNK_DURATION_MS = 100  # 100ms chunks
CHUNK_SIZE = int(SAMPLE_RATE * CHANNELS * 2 * CHUNK_DURATION_MS / 1000)  # bytes per chunk


class StreamAudioCaptureError(Exception):
    """Raised when stream audio capture fails."""


class StreamAudioCapture:
    """
    Captures audio from HLS streams using FFmpeg.

    Extracts audio in real-time and outputs 16kHz mono PCM chunks
    suitable for speech-to-text processing.
    """

    def __init__(self, stream_url: str, channel_id: str):
        """
        Initialize stream audio capture.

        Args:
            stream_url: HLS stream URL to capture audio from
            channel_id: Channel identifier for logging
        """
        self.stream_url = stream_url
        self.channel_id = channel_id
        self._process: Optional[subprocess.Popen] = None
        self._is_running = False
        self._stop_event = asyncio.Event()

    async def start(self) -> None:
        """
        Start the FFmpeg audio capture process.

        Raises:
            StreamAudioCaptureError: If FFmpeg fails to start
        """
        if self._is_running:
            logger.warning(
                f"Audio capture already running for channel {self.channel_id}"
            )
            return

        # Validate stream URL for security
        validator = FFmpegInputValidator()
        if not validator.validate_url(self.stream_url):
            raise StreamAudioCaptureError(
                f"Invalid or blocked stream URL: {self.stream_url}"
            )

        logger.info(
            "Starting FFmpeg audio capture",
            extra={
                "channel_id": self.channel_id,
                "stream_url": self.stream_url[:100],  # Truncate for logging
                "sample_rate": SAMPLE_RATE,
                "chunk_size": CHUNK_SIZE,
            }
        )

        try:
            # FFmpeg command to extract audio as 16kHz mono PCM
            cmd = [
                "ffmpeg",
                "-hide_banner",
                "-loglevel", "warning",
                # Input options
                "-reconnect", "1",
                "-reconnect_streamed", "1",
                "-reconnect_delay_max", "5",
                "-i", self.stream_url,
                # Audio output options
                "-vn",  # No video
                "-acodec", "pcm_s16le",  # 16-bit PCM
                "-ar", str(SAMPLE_RATE),  # 16kHz sample rate
                "-ac", str(CHANNELS),  # Mono
                "-f", SAMPLE_FORMAT,  # Raw PCM format
                "-",  # Output to stdout
            ]

            self._process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=CHUNK_SIZE,
            )

            self._is_running = True
            self._stop_event.clear()

            logger.info(
                f"FFmpeg audio capture started for channel {self.channel_id}"
            )

        except Exception as e:
            logger.error(
                "Failed to start FFmpeg audio capture",
                extra={"channel_id": self.channel_id, "error": str(e)}
            )
            raise StreamAudioCaptureError(f"Failed to start FFmpeg: {e}")

    async def stop(self) -> None:
        """Stop the FFmpeg audio capture process."""
        if not self._is_running:
            return

        self._is_running = False
        self._stop_event.set()

        if self._process:
            try:
                self._process.terminate()
                # Wait for graceful termination
                await asyncio.get_event_loop().run_in_executor(
                    None, self._process.wait, 2.0
                )
            except Exception:
                # Force kill if terminate didn't work
                try:
                    self._process.kill()
                except Exception:
                    pass
            finally:
                self._process = None

        logger.info(
            f"FFmpeg audio capture stopped for channel {self.channel_id}"
        )

    async def read_chunks(self) -> AsyncIterator[bytes]:
        """
        Async iterator that yields audio chunks.

        Yields:
            bytes: PCM audio chunks (16kHz mono, 16-bit signed)
        """
        if not self._process or not self._process.stdout:
            raise StreamAudioCaptureError("Audio capture not started")

        loop = asyncio.get_event_loop()
        consecutive_empty = 0
        max_consecutive_empty = 50  # ~5 seconds of silence before giving up

        while self._is_running and not self._stop_event.is_set():
            try:
                # Read chunk in thread pool to avoid blocking
                chunk = await loop.run_in_executor(
                    None,
                    self._process.stdout.read,
                    CHUNK_SIZE
                )

                if not chunk:
                    consecutive_empty += 1
                    if consecutive_empty >= max_consecutive_empty:
                        logger.warning(
                            f"No audio data for {max_consecutive_empty} chunks, "
                            f"stream may have ended: channel {self.channel_id}"
                        )
                        break
                    await asyncio.sleep(0.01)
                    continue

                consecutive_empty = 0
                yield chunk

            except Exception as e:
                if self._is_running:
                    logger.error(
                        "Error reading audio chunk",
                        extra={"channel_id": self.channel_id, "error": str(e)}
                    )
                break

        # Check if FFmpeg exited with error
        if self._process and self._process.poll() is not None:
            return_code = self._process.returncode
            if return_code != 0:
                stderr = ""
                try:
                    stderr = self._process.stderr.read().decode()[:500]
                except Exception:
                    pass
                logger.error(
                    f"FFmpeg exited with code {return_code}",
                    extra={
                        "channel_id": self.channel_id,
                        "stderr": stderr,
                    }
                )

    @property
    def is_running(self) -> bool:
        """Check if audio capture is currently running."""
        return self._is_running and self._process is not None

    async def __aenter__(self):
        """Context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        await self.stop()
