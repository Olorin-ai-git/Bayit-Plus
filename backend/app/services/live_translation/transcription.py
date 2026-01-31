"""Audio transcription pipeline with multi-provider support."""
import asyncio
import logging
import queue
import threading
from typing import AsyncIterator, Union, Tuple

from .text_processing import deduplicate_transcript

logger = logging.getLogger(__name__)


class TranscriptionPipeline:
    """Manages audio transcription across providers."""

    def __init__(self, stt_manager):
        """
        Initialize transcription pipeline.

        Args:
            stt_manager: STTProviderManager instance
        """
        self.stt_manager = stt_manager

    async def transcribe(
        self, audio_stream: AsyncIterator[bytes], source_lang: str
    ) -> AsyncIterator[Union[str, Tuple[str, str]]]:
        """
        Transcribe audio stream to text.

        Args:
            audio_stream: Async iterator of audio bytes
            source_lang: Source language code

        Yields:
            For Google/Whisper: transcript string
            For ElevenLabs: tuple of (transcript, detected_lang)
        """
        try:
            if self.stt_manager.provider == "google":
                # Google Cloud Speech-to-Text (streaming with async/sync bridge)
                async for transcript in self._transcribe_google(audio_stream, source_lang):
                    yield transcript

            elif self.stt_manager.provider == "whisper":
                # OpenAI Whisper (buffered streaming)
                async for transcript in self.stt_manager.whisper_service.transcribe_audio_stream(
                    audio_stream, source_lang=source_lang
                ):
                    logger.debug(f"Whisper transcribed: {transcript}")
                    yield transcript

            elif self.stt_manager.provider == "elevenlabs":
                # ElevenLabs Scribe v2 (true realtime WebSocket streaming)
                logger.info(
                    f"🎤 Starting ElevenLabs Scribe v2 realtime stream "
                    f"(language: {source_lang}, ~150ms latency)"
                )
                async for (
                    transcript,
                    detected_lang,
                ) in self.stt_manager.elevenlabs_service.transcribe_audio_stream(
                    audio_stream,
                    source_lang=source_lang,
                ):
                    # Apply deduplication to remove repetitive patterns
                    deduplicated = deduplicate_transcript(transcript)
                    if deduplicated != transcript:
                        logger.info(
                            f"📝 ElevenLabs transcribed [{detected_lang}]: {transcript} "
                            f"→ deduplicated to: {deduplicated}"
                        )
                    else:
                        logger.info(
                            f"📝 ElevenLabs transcribed [{detected_lang}]: {transcript}"
                        )
                    # Yield tuple with detected language for translation pipeline
                    yield (deduplicated, detected_lang)

        except Exception as e:
            logger.error(f"Transcription error ({self.stt_manager.provider}): {str(e)}")
            raise

    async def _transcribe_google(
        self, audio_stream: AsyncIterator[bytes], source_lang: str
    ) -> AsyncIterator[str]:
        """
        Transcribe using Google Speech-to-Text with async/sync bridge.

        Args:
            audio_stream: Async iterator of audio bytes
            source_lang: Source language code

        Yields:
            Transcribed text chunks
        """
        from google.cloud import speech_v1p1beta1 as speech

        streaming_config = self.stt_manager.get_recognition_config(source_lang)
        logger.info(
            f"🎤 Starting Google Speech-to-Text stream for language: {source_lang}"
        )

        # Use thread-safe queues to bridge async audio stream with sync Google API
        audio_queue = queue.Queue()
        transcript_queue = queue.Queue()
        done_receiving = threading.Event()
        done_processing = threading.Event()

        async def audio_collector():
            """Collect audio chunks from async stream into thread-safe queue."""
            try:
                chunk_count = 0
                async for audio_chunk in audio_stream:
                    audio_queue.put(audio_chunk)
                    chunk_count += 1
                    if chunk_count % 100 == 0:
                        logger.debug(f"📦 Collected {chunk_count} audio chunks")
            except Exception as e:
                logger.error(f"❌ Error collecting audio: {str(e)}")
            finally:
                done_receiving.set()
                logger.info("✅ Audio collection finished")

        def sync_recognition_worker():
            """Run synchronous Google Speech API in separate thread."""
            logger.info("🔊 Starting Google Speech recognition worker...")

            def request_generator():
                """Generate requests for Google Speech API."""
                yield speech.StreamingRecognizeRequest(
                    streaming_config=streaming_config
                )

                while not done_receiving.is_set() or not audio_queue.empty():
                    try:
                        # Use timeout to periodically check done flag
                        audio_chunk = audio_queue.get(timeout=0.1)
                        yield speech.StreamingRecognizeRequest(audio_content=audio_chunk)
                    except queue.Empty:
                        if done_receiving.is_set() and audio_queue.empty():
                            break
                        continue

            try:
                responses = self.stt_manager.speech_client.streaming_recognize(
                    request_generator()
                )
                for response in responses:
                    if response.results and response.results[0].is_final:
                        if response.results[0].alternatives:
                            transcript = response.results[0].alternatives[0].transcript
                            logger.info(f"📝 Google transcribed: {transcript}")
                            # Put transcript into queue for async consumer
                            transcript_queue.put(transcript)
            except Exception as e:
                logger.error(f"❌ Google Speech recognition error: {str(e)}")
            finally:
                done_processing.set()
                logger.info("✅ Recognition worker finished")

        # Start audio collection task
        collector_task = asyncio.create_task(audio_collector())

        # Start recognition worker in thread pool
        loop = asyncio.get_event_loop()
        recognition_task = loop.run_in_executor(None, sync_recognition_worker)

        # Yield transcripts as they arrive
        try:
            while not done_processing.is_set() or not transcript_queue.empty():
                try:
                    # Check queue with timeout to avoid blocking
                    transcript = await loop.run_in_executor(
                        None, lambda: transcript_queue.get(timeout=0.5)
                    )
                    yield transcript
                except queue.Empty:
                    # Check if we're done
                    if done_processing.is_set() and transcript_queue.empty():
                        break
                    continue
                except Exception as e:
                    logger.error(f"❌ Error getting transcript: {str(e)}")
                    break
        except Exception as e:
            logger.error(f"❌ Error yielding transcripts: {str(e)}")

        # Wait for both tasks to complete
        await collector_task
        await recognition_task
        logger.info("✅ Transcription stream completed")
