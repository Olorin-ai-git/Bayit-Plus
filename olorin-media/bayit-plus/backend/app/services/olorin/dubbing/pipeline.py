"""
Dubbing Pipeline

Processing logic for transcription and TTS generation.
Uses TTS connection pool (P1-1) and per-session voice settings (P3-2).
"""

import asyncio
import base64
import json
import logging
import time
from typing import Optional

from app.core.config import settings
from app.services.olorin.dubbing.models import DubbingMessage, DubbingMetrics
from app.services.olorin.dubbing.prometheus_metrics import (
    record_cache_hit,
    record_cache_miss,
    record_error,
    record_stt_latency,
    record_total_latency,
    record_translation_latency,
    record_tts_latency,
)
from app.services.olorin.dubbing.transcript_utils import compress_transcript
from app.services.olorin.dubbing.tts_connection_pool import get_tts_pool
from app.services.olorin.dubbing.voice_settings import VoiceSettings

logger = logging.getLogger(__name__)

# P0-4: Module-level pipeline semaphore (initialized lazily)
_pipeline_semaphore: Optional[asyncio.Semaphore] = None


def _get_pipeline_semaphore() -> asyncio.Semaphore:
    """Get or create the pipeline concurrency semaphore."""
    global _pipeline_semaphore
    if _pipeline_semaphore is None:
        max_tasks = settings.olorin.dubbing.max_concurrent_pipeline_tasks
        _pipeline_semaphore = asyncio.Semaphore(max_tasks)
    return _pipeline_semaphore


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
    voice_settings: Optional[VoiceSettings] = None,
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
        voice_settings: Optional per-session voice customization (P3-2)
    """
    try:
        async for transcript, detected_lang in stt_provider.receive_transcripts():
            if not running_check():
                break

            stt_end_time = time.time() * 1000
            segment_start = get_segment_start_time()
            stt_latency = stt_end_time - segment_start if segment_start else 0
            metrics.stt_latencies_ms.append(stt_latency)
            record_stt_latency(stt_latency)

            # P2-5: Compress transcript (remove fillers)
            lang_for_compression = detected_lang or source_language
            compression = compress_transcript(transcript, lang_for_compression)
            compressed_transcript = compression.compressed_text
            metrics.filler_words_removed += compression.fillers_removed
            metrics.characters_compressed += (
                compression.original_length - compression.compressed_length
            )

            await output_queue.put(
                DubbingMessage(
                    type="transcript",
                    original_text=transcript,
                    source_language=lang_for_compression,
                    timestamp_ms=stt_end_time,
                )
            )

            asyncio.create_task(
                process_translation_tts(
                    transcript=compressed_transcript,
                    source_lang=detected_lang or source_language,
                    stt_end_time=stt_end_time,
                    target_language=target_language,
                    voice_id=voice_id,
                    translation_provider=translation_provider,
                    output_queue=output_queue,
                    metrics=metrics,
                    voice_settings=voice_settings,
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
    voice_settings: Optional[VoiceSettings] = None,
) -> None:
    """
    Translate transcript and generate TTS audio.

    Uses P0-4 semaphore to bound concurrency.
    Uses P1-1 TTS connection pool for reduced latency.
    Uses P3-2 per-session voice settings.
    """
    ws = None

    # P0-4: Bound concurrent pipeline tasks
    semaphore = _get_pipeline_semaphore()

    async with semaphore:
        try:
            # Translate (returns tuple: text, was_cached)
            translation_start = time.time() * 1000
            translated_text, was_cached = await translation_provider.translate(
                transcript, source_lang
            )
            translation_end = time.time() * 1000
            translation_latency = translation_end - translation_start

            metrics.translation_latencies_ms.append(translation_latency)
            metrics.total_characters_translated += len(transcript)
            record_translation_latency(translation_latency)

            # P2-4: Track cache stats
            if was_cached:
                metrics.translation_cache_hits += 1
                record_cache_hit()
            else:
                metrics.translation_cache_misses += 1
                record_cache_miss()

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

            # P1-1: Generate TTS using connection pool
            tts_start = time.time() * 1000
            pool = get_tts_pool()
            ws = await pool.acquire(voice_id=voice_id)

            # P3-2: Apply per-session voice settings
            tts_voice_settings = (
                voice_settings or VoiceSettings()
            ).to_elevenlabs_dict()

            init_message = {
                "text": " ",
                "voice_settings": tts_voice_settings,
                "generation_config": {
                    "chunk_length_schedule": [120, 160, 250, 290],
                },
                "xi_api_key": settings.ELEVENLABS_API_KEY,
            }
            await ws.send(json.dumps(init_message))

            # Send translated text
            text_message = {
                "text": translated_text,
                "try_trigger_generation": True,
                "flush": True,
            }
            await ws.send(json.dumps(text_message))

            # Signal end of text input
            await ws.send(json.dumps({"text": "", "flush": True}))

            # Receive audio chunks from TTS
            first_audio_time: Optional[float] = None
            async for raw_message in ws:
                data = json.loads(raw_message)

                if "error" in data:
                    raise RuntimeError(
                        data.get("error", "Unknown TTS error")
                    )

                if "audio" in data and data["audio"]:
                    audio_bytes = base64.b64decode(data["audio"])
                    if first_audio_time is None:
                        first_audio_time = time.time() * 1000
                        tts_latency = first_audio_time - tts_start
                        metrics.tts_latencies_ms.append(tts_latency)
                        record_tts_latency(tts_latency)

                    audio_b64 = base64.b64encode(
                        audio_bytes
                    ).decode("utf-8")
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

                if data.get("isFinal"):
                    break

            # Release connection back to pool
            await pool.release(ws)
            ws = None

            metrics.segments_processed += 1
            metrics.total_characters_synthesized += len(translated_text)

            if first_audio_time:
                total_latency = first_audio_time - stt_end_time
                metrics.total_latencies_ms.append(total_latency)
                record_total_latency(total_latency)

                await output_queue.put(
                    DubbingMessage(
                        type="latency_report",
                        latency_ms=total_latency,
                        message=(
                            f"STT: {metrics.stt_latencies_ms[-1]:.0f}ms, "
                            f"Translation: {translation_latency:.0f}ms, "
                            f"TTS: {metrics.tts_latencies_ms[-1]:.0f}ms"
                        ),
                    )
                )

                logger.debug(
                    f"Dubbing segment completed: {len(transcript)} chars, "
                    f"total latency: {total_latency:.0f}ms"
                )

        except Exception as e:
            logger.error(f"Error in translation/TTS pipeline: {e}")
            metrics.error_count += 1
            record_error(error_type="pipeline")
            await output_queue.put(
                DubbingMessage(type="error", message=str(e))
            )
        finally:
            if ws:
                try:
                    pool = get_tts_pool()
                    await pool.release(ws)
                except Exception:
                    pass
