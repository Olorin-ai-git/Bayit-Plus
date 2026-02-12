"""
Bilingual TTS Service.

Two-voice text-to-speech for code-switched Hebrew/English segments.
Switches between Hebrew and English ElevenLabs voices at language
boundaries to produce natural bilingual audio output.
"""

import logging
from typing import List

from app.core.config import settings
from app.services.olorin.dubbing.tts_stream import TTSResult, stream_tts

logger = logging.getLogger(__name__)


class BilingualTTS:
    """Synthesizes bilingual audio using language-specific voices."""

    def _get_voice_id(self, language: str) -> str:
        """Return the configured voice ID for a language code.

        Args:
            language: ISO 639-1 language code ("he" or "en").

        Returns:
            ElevenLabs voice ID from settings.
        """
        if language == "he":
            return settings.BILINGUAL_DUBBING_HEBREW_VOICE_ID
        return settings.BILINGUAL_DUBBING_ENGLISH_VOICE_ID

    async def synthesize(
        self, language_segments: List[dict]
    ) -> List[bytes]:
        """Synthesize bilingual audio from code-switched segments.

        Iterates through language segments, calling stream_tts with the
        appropriate voice for each segment's language. Concatenates all
        resulting audio chunks into a single ordered list.

        Args:
            language_segments: List of dicts with "text" and "language"
                keys, e.g. [{"text": "shalom", "language": "he"},
                {"text": "my friend", "language": "en"}].

        Returns:
            Ordered list of audio chunk bytes across all segments.

        Raises:
            RuntimeError: If TTS fails for any segment.
        """
        all_chunks: List[bytes] = []
        total_segments = len(language_segments)

        for index, segment in enumerate(language_segments):
            text = segment.get("text", "").strip()
            language = segment.get("language", "en")

            if not text:
                logger.debug(
                    "Skipping empty bilingual TTS segment",
                    extra={
                        "segment_index": index,
                        "total_segments": total_segments,
                    },
                )
                continue

            voice_id = self._get_voice_id(language)
            tts_result: TTSResult = await stream_tts(
                text=text,
                voice_id=voice_id,
            )

            if tts_result.error:
                logger.error(
                    "Bilingual TTS segment failed",
                    extra={
                        "segment_index": index,
                        "language": language,
                        "text_length": len(text),
                        "error": tts_result.error,
                    },
                )
                raise RuntimeError(
                    f"TTS failed for segment {index} "
                    f"(lang={language}): {tts_result.error}"
                )

            all_chunks.extend(tts_result.audio_chunks)

            logger.debug(
                "Bilingual TTS segment synthesized",
                extra={
                    "segment_index": index,
                    "language": language,
                    "text_length": len(text),
                    "audio_bytes": tts_result.total_audio_bytes,
                    "chunks": len(tts_result.audio_chunks),
                },
            )

        logger.info(
            "Bilingual TTS synthesis complete",
            extra={
                "total_segments": total_segments,
                "total_chunks": len(all_chunks),
                "total_bytes": sum(len(c) for c in all_chunks),
            },
        )
        return all_chunks


bilingual_tts = BilingualTTS()
