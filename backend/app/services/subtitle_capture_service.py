"""
Subtitle Capture Service
Captures real-time subtitles during live recording sessions by subscribing
to the shared ChannelSTTManager broadcast and translating via LiveTranslationService.
"""

import asyncio
import logging
import time
from pathlib import Path
from typing import Optional

from app.models.recording import RecordingSubtitleCue

logger = logging.getLogger(__name__)


class SubtitleCaptureService:
    """Captures subtitles in real-time during a recording session."""

    def __init__(self):
        self._recording_id: Optional[str] = None
        self._channel_id: Optional[str] = None
        self._source_lang: Optional[str] = None
        self._target_lang: Optional[str] = None
        self._session_id: Optional[str] = None
        self._transcript_queue: Optional[asyncio.Queue] = None
        self._capture_task: Optional[asyncio.Task] = None
        self._cue_sequence: int = 0
        self._recording_start_time: Optional[float] = None
        self._running: bool = False
        self._cues: list = []

    async def start_capture(
        self,
        recording_id: str,
        channel_id: str,
        source_lang: str,
        target_lang: str,
    ) -> None:
        """Start capturing subtitles for a recording session."""
        from app.services.live_dubbing.channel_stt_manager import (
            get_channel_stt_manager,
        )

        self._recording_id = recording_id
        self._channel_id = channel_id
        self._source_lang = source_lang
        self._target_lang = target_lang
        self._session_id = f"subtitle_capture_{recording_id}"
        self._cue_sequence = 0
        self._recording_start_time = time.time()
        self._running = True
        self._cues = []

        stt_manager = await get_channel_stt_manager(channel_id, source_lang)
        self._transcript_queue = await stt_manager.subscribe(self._session_id)
        self._capture_task = asyncio.create_task(self._capture_loop())

        logger.info(
            "Subtitle capture started",
            extra={
                "recording_id": recording_id,
                "channel_id": channel_id,
                "source_lang": source_lang,
                "target_lang": target_lang,
            },
        )

    async def stop_capture(self) -> Optional[Path]:
        """Stop capturing subtitles and generate WebVTT file."""
        self._running = False

        if self._capture_task and not self._capture_task.done():
            self._capture_task.cancel()
            try:
                await self._capture_task
            except asyncio.CancelledError:
                pass

        await self._unsubscribe()

        logger.info(
            "Subtitle capture stopped",
            extra={
                "recording_id": self._recording_id,
                "cues_captured": self._cue_sequence,
            },
        )

        if self._cue_sequence == 0:
            return None

        from app.services.webvtt_generator import generate_webvtt

        return await generate_webvtt(self._recording_id, self._cues)

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
        """Background loop that processes transcript messages."""
        from app.services.live_translation import LiveTranslationService

        translation_service = LiveTranslationService()

        while self._running:
            try:
                transcript = await asyncio.wait_for(
                    self._transcript_queue.get(), timeout=5.0
                )
                if not self._running:
                    break

                await self._process_transcript(translation_service, transcript)

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "Error in subtitle capture loop",
                    extra={"recording_id": self._recording_id, "error": str(e)},
                )
                await asyncio.sleep(1.0)

    async def _process_transcript(self, translation_service, transcript) -> None:
        """Process a single transcript into a subtitle cue."""
        elapsed = time.time() - self._recording_start_time
        start_seconds = max(0.0, elapsed - 3.0)
        end_seconds = elapsed

        original_text = transcript.text
        translated_text = original_text

        if self._target_lang and self._target_lang != self._source_lang:
            try:
                translated_text = await translation_service.translate_text(
                    text=original_text,
                    source_lang=self._source_lang,
                    target_lang=self._target_lang,
                )
            except Exception as e:
                logger.warning(
                    "Translation failed for subtitle cue, using original",
                    extra={"recording_id": self._recording_id, "error": str(e)},
                )
                translated_text = original_text

        self._cue_sequence += 1

        cue = RecordingSubtitleCue(
            recording_id=self._recording_id,
            sequence=self._cue_sequence,
            start_time_seconds=start_seconds,
            end_time_seconds=end_seconds,
            text=translated_text,
            original_text=original_text,
            source_lang=self._source_lang,
            target_lang=self._target_lang or self._source_lang,
            confidence=1.0,
        )
        await cue.insert()
        self._cues.append(cue)
