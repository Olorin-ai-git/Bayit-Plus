"""
Dubbing Audio Capture Service
Captures dubbed audio during live recording via shared STT broadcast.
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class DubbingCaptureService:
    """Captures dubbed audio in real-time during a recording session."""

    def __init__(self):
        self._recording_id: Optional[str] = None
        self._channel_id: Optional[str] = None
        self._target_language: Optional[str] = None
        self._voice_id: Optional[str] = None
        self._session_id: Optional[str] = None
        self._transcript_queue: Optional[asyncio.Queue] = None
        self._capture_task: Optional[asyncio.Task] = None
        self._pcm_path: Optional[Path] = None
        self._pcm_file = None
        self._running: bool = False
        self._source_lang: Optional[str] = None
        self._segments_captured: int = 0

    async def start_capture(
        self, recording_id: str, channel_id: str, target_language: str,
        voice_id: Optional[str] = None, source_language: str = "he",
    ) -> None:
        """Start capturing dubbed audio for a recording session."""
        from app.services.live_dubbing.channel_stt_manager import (
            get_channel_stt_manager,
        )

        self._recording_id = recording_id
        self._channel_id = channel_id
        self._target_language = target_language
        self._source_lang = source_language
        self._voice_id = voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID
        self._session_id = f"dubbing_capture_{recording_id}"
        self._running = True
        self._segments_captured = 0

        self._pcm_path = Path(settings.RECORDING_TEMP_DIR) / f"{recording_id}_dubbed.pcm"
        self._pcm_path.parent.mkdir(parents=True, exist_ok=True)
        self._pcm_file = open(str(self._pcm_path), "wb")

        stt_manager = await get_channel_stt_manager(channel_id, source_language)
        self._transcript_queue = await stt_manager.subscribe(self._session_id)

        self._capture_task = asyncio.create_task(self._capture_loop())

        logger.info(
            "Dubbing capture started",
            extra={
                "recording_id": recording_id,
                "channel_id": channel_id,
                "target_language": target_language,
                "voice_id": self._voice_id,
            },
        )

    async def stop_capture(self) -> Optional[Path]:
        """Stop capturing dubbed audio and convert PCM to AAC."""
        self._running = False

        if self._capture_task and not self._capture_task.done():
            self._capture_task.cancel()
            try:
                await self._capture_task
            except asyncio.CancelledError:
                pass

        if self._pcm_file and not self._pcm_file.closed:
            self._pcm_file.close()

        await self._unsubscribe()

        logger.info(
            "Dubbing capture stopped",
            extra={
                "recording_id": self._recording_id,
                "segments_captured": self._segments_captured,
            },
        )

        if self._segments_captured == 0 or not self._pcm_path:
            self._cleanup_temp_files()
            return None

        from app.services.recording_audio_converter import convert_pcm_to_aac

        return await convert_pcm_to_aac(self._pcm_path, self._recording_id)

    async def _unsubscribe(self) -> None:
        """Unsubscribe from the STT manager."""
        if not self._session_id or not self._channel_id:
            return
        try:
            from app.services.live_dubbing.channel_stt_manager import (
                get_channel_stt_manager,
            )

            stt_manager = await get_channel_stt_manager(
                self._channel_id, self._source_lang
            )
            await stt_manager.unsubscribe(self._session_id)
        except Exception as e:
            logger.warning(
                "Failed to unsubscribe from STT manager",
                extra={"recording_id": self._recording_id, "error": str(e)},
            )

    async def _capture_loop(self) -> None:
        """Background loop that processes transcripts and generates TTS audio."""
        from app.services.live_translation import LiveTranslationService

        translation_service = LiveTranslationService()

        while self._running:
            try:
                transcript = await asyncio.wait_for(
                    self._transcript_queue.get(), timeout=5.0
                )
                if not self._running:
                    break

                original_text = transcript.text
                if not original_text or not original_text.strip():
                    continue

                translated_text = await self._translate(
                    translation_service, original_text
                )
                if not translated_text:
                    continue

                await self._synthesize_and_write(translated_text)

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "Error in dubbing capture loop",
                    extra={"recording_id": self._recording_id, "error": str(e)},
                )
                await asyncio.sleep(1.0)

    async def _translate(self, translation_service, text: str) -> Optional[str]:
        """Translate text if target language differs from source."""
        if self._target_language == self._source_lang:
            return text
        try:
            return await translation_service.translate_text(
                text=text,
                source_lang=self._source_lang,
                target_lang=self._target_language,
            )
        except Exception as e:
            logger.warning(
                "Translation failed for dubbing segment",
                extra={"recording_id": self._recording_id, "error": str(e)},
            )
            return None

    async def _synthesize_and_write(self, text: str) -> None:
        """Generate TTS audio and write to PCM file."""
        try:
            from app.services.elevenlabs_tts_service import elevenlabs_tts_service

            audio_data = await elevenlabs_tts_service.generate_speech(
                text=text,
                voice_id=self._voice_id,
                output_format="pcm_24000",
            )
            if audio_data and self._pcm_file and not self._pcm_file.closed:
                self._pcm_file.write(audio_data)
                self._pcm_file.flush()
                self._segments_captured += 1
        except Exception as e:
            logger.warning(
                "TTS generation failed for dubbing segment",
                extra={"recording_id": self._recording_id, "error": str(e)},
            )

    def _cleanup_temp_files(self) -> None:
        """Clean up temporary PCM and AAC files."""
        if self._pcm_path and self._pcm_path.exists():
            self._pcm_path.unlink(missing_ok=True)
