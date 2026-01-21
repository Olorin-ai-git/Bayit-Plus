"""
Dubbing Pipeline

Processing logic for transcription and TTS generation.
"""

import asyncio
import base64
import logging
import time
from typing import Optional

from app.services.elevenlabs_tts_streaming_service import \
    ElevenLabsTTSStreamingService
from app.services.olorin.dubbing.models import DubbingMessage, DubbingMetrics

logger = logging.getLogger(__name__)


async def process_transcripts(
    stt_provider,
    output_queue: asyncio.Queue[DubbingMessage],
    metrics: DubbingMetrics,
    source_language: str,
    target_language: str,
    voice_id: str,
    translation_provider,
    running_check,
    get_segment_start_time,
    reset_segment_time,
) -> None:
    """
    Background task to process STT transcripts.

    Args:
        stt_provider: STT provider instance (STTProvider interface)
        output_queue: Queue for output messages
        metrics: Dubbing session metrics
        source_language: Source language code
        target_language: Target language code
        voice_id: ElevenLabs voice ID
        translation_provider: Translation provider instance
        running_check: Callable returning bool for running state
        get_segment_start_time: Callable to get segment start time
        reset_segment_time: Callable to reset segment time
    """
    try:
        async for transcript, detected_lang in stt_provider.receive_transcripts():
            if not running_check():
                break

            stt_end_time = time.time() * 1000
            segment_start = get_segment_start_time()
            stt_latency = stt_end_time - segment_start if segment_start else 0
            metrics.stt_latencies_ms.append(stt_latency)

            await output_queue.put(
                DubbingMessage(
                    type="transcript",
                    original_text=transcript,
                    source_language=detected_lang or source_language,
                    timestamp_ms=stt_end_time,
                )
            )

            asyncio.create_task(
                process_translation_tts(
                    transcript=transcript,
                    source_lang=detected_lang or source_language,
                    stt_end_time=stt_end_time,
                    target_language=target_language,
                    voice_id=voice_id,
                    translation_provider=translation_provider,
                    output_queue=output_queue,
                    metrics=metrics,
                )
            )

            reset_segment_time()

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Error processing transcripts: {e}")
        metrics.error_count += 1
        await output_queue.put(DubbingMessage(type="error", message=str(e)))


async def process_translation_tts(
    transcript: str,
    source_lang: str,
    stt_end_time: float,
    target_language: str,
    voice_id: str,
    translation_provider,
    output_queue: asyncio.Queue[DubbingMessage],
    metrics: DubbingMetrics,
) -> None:
    """
    Translate transcript and generate TTS audio.

    Args:
        transcript: Original transcript text
        source_lang: Detected source language
        stt_end_time: Timestamp when STT completed (ms)
        target_language: Target language code
        voice_id: ElevenLabs voice ID
        translation_provider: Translation provider instance
        output_queue: Queue for output messages
        metrics: Dubbing session metrics
    """
    tts_service: Optional[ElevenLabsTTSStreamingService] = None

    try:
        # Translate
        translation_start = time.time() * 1000
        translated_text = await translation_provider.translate(transcript, source_lang)
        translation_end = time.time() * 1000
        translation_latency = translation_end - translation_start

        metrics.translation_latencies_ms.append(translation_latency)
        metrics.total_characters_translated += len(transcript)

        await output_queue.put(
            DubbingMessage(
                type="translation",
                original_text=transcript,
                translated_text=translated_text,
                source_language=source_lang,
                target_language=target_language,
                latency_ms=translation_latency,
            )
        )

        # Generate TTS
        tts_start = time.time() * 1000
        tts_service = ElevenLabsTTSStreamingService()
        await tts_service.connect(voice_id=voice_id)

        await tts_service.send_text_chunk(translated_text, flush=True)
        await tts_service.finish_stream()

        first_audio_time: Optional[float] = None
        async for audio_chunk in tts_service.receive_audio():
            if first_audio_time is None:
                first_audio_time = time.time() * 1000
                tts_latency = first_audio_time - tts_start
                metrics.tts_latencies_ms.append(tts_latency)

            audio_b64 = base64.b64encode(audio_chunk).decode("utf-8")
            total_latency = (time.time() * 1000) - stt_end_time

            await output_queue.put(
                DubbingMessage(
                    type="dubbed_audio",
                    data=audio_b64,
                    original_text=transcript,
                    translated_text=translated_text,
                    source_language=source_lang,
                    target_language=target_language,
                    latency_ms=total_latency,
                )
            )

        await tts_service.close()
        tts_service = None

        metrics.segments_processed += 1
        metrics.total_characters_synthesized += len(translated_text)

        if first_audio_time:
            total_latency = first_audio_time - stt_end_time
            metrics.total_latencies_ms.append(total_latency)

            await output_queue.put(
                DubbingMessage(
                    type="latency_report",
                    latency_ms=total_latency,
                    message=f"STT: {metrics.stt_latencies_ms[-1]:.0f}ms, "
                    f"Translation: {translation_latency:.0f}ms, "
                    f"TTS: {metrics.tts_latencies_ms[-1]:.0f}ms",
                )
            )

            logger.debug(
                f"Dubbing segment completed: {len(transcript)} chars, "
                f"total latency: {total_latency:.0f}ms"
            )

    except Exception as e:
        logger.error(f"Error in translation/TTS pipeline: {e}")
        metrics.error_count += 1
        await output_queue.put(DubbingMessage(type="error", message=str(e)))
    finally:
        if tts_service:
            await tts_service.close()
