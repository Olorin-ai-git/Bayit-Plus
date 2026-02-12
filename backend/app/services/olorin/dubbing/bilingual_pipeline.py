"""
Bilingual Dubbing Pipeline.

Coordinates code-switch translation and bilingual TTS for a complete
dubbing segment. Parallel pipeline to pipeline.py, specialized for
the progressive Hebrew/English bilingual bridge feature.
"""

import logging
import time
from typing import Dict, List

from app.services.olorin.dubbing.bilingual_service import (
    bilingual_dubbing_service,
)
from app.services.olorin.dubbing.bilingual_tts import bilingual_tts

logger = logging.getLogger(__name__)


class BilingualPipeline:
    """Processes bilingual dubbing segments end-to-end."""

    async def process_segment(
        self,
        session_id: str,
        hebrew_text: str,
        timestamp_seconds: float,
    ) -> Dict:
        """Process a single bilingual dubbing segment.

        Coordinates the full pipeline:
        1. Code-switch translation via bilingual_service
        2. Two-voice TTS synthesis via bilingual_tts

        Args:
            session_id: Active bilingual dubbing session ID.
            hebrew_text: Original Hebrew text to process.
            timestamp_seconds: Video timestamp of the segment.

        Returns:
            Dict with keys:
                - mixed_text: The code-switched text output.
                - audio_chunks: List of synthesized audio bytes.
                - hebrew_words_used: Hebrew words retained.
                - latency_ms: End-to-end processing time.
        """
        pipeline_start_ms = time.time() * 1000

        translation_result = await bilingual_dubbing_service.translate_segment(
            session_id=session_id,
            hebrew_text=hebrew_text,
            timestamp_seconds=timestamp_seconds,
        )

        mixed_text: str = translation_result.get("mixed_text", "")
        hebrew_words_used: List[str] = translation_result.get(
            "hebrew_words_used", []
        )
        language_segments: List[dict] = translation_result.get(
            "language_segments", []
        )

        translation_ms = time.time() * 1000 - pipeline_start_ms

        audio_chunks: List[bytes] = []
        if language_segments:
            audio_chunks = await bilingual_tts.synthesize(language_segments)

        total_ms = time.time() * 1000 - pipeline_start_ms

        logger.info(
            "Bilingual pipeline segment processed",
            extra={
                "session_id": session_id,
                "timestamp_seconds": timestamp_seconds,
                "hebrew_text_length": len(hebrew_text),
                "mixed_text_length": len(mixed_text),
                "hebrew_words_count": len(hebrew_words_used),
                "segments_count": len(language_segments),
                "audio_chunks_count": len(audio_chunks),
                "translation_ms": round(translation_ms, 1),
                "total_ms": round(total_ms, 1),
            },
        )

        return {
            "mixed_text": mixed_text,
            "audio_chunks": audio_chunks,
            "hebrew_words_used": hebrew_words_used,
            "latency_ms": round(total_ms, 1),
        }


bilingual_pipeline = BilingualPipeline()
