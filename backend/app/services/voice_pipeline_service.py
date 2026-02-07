"""
Voice Pipeline Service
Orchestrates the complete streaming voice interaction flow:
Audio → STT → LLM → TTS → Audio

Reduces end-to-end latency from ~20s to ~3-5s by:
1. Using WebSocket-based realtime STT (~150ms latency)
2. Streaming LLM responses (first token in ~100-300ms)
3. Streaming TTS generation (first audio in ~300-500ms)
"""

import asyncio
import base64
import json
from dataclasses import dataclass, field
from typing import AsyncIterator, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.user import User
from app.services.elevenlabs_realtime_service import ElevenLabsRealtimeService
from app.services.elevenlabs_tts_streaming_service import \
    ElevenLabsTTSStreamingService
from app.services.support_service import support_service
from app.services.voice.intent_router import IntentRouter
from app.services.voice.models import VoiceIntent, VoiceResponse

logger = get_logger(__name__)


@dataclass
class PipelineMessage:
    """Message type for voice pipeline communication."""

    type: str  # audio, commit, cancel, transcript_partial, transcript_final, llm_chunk, tts_audio, intent_action, complete, error
    data: Optional[str] = None  # Base64 audio data or text
    text: Optional[str] = None  # Text content
    language: Optional[str] = None  # Detected language
    conversation_id: Optional[str] = None  # Conversation tracking
    escalation_needed: Optional[bool] = None
    message: Optional[str] = None  # Error message
    intent: Optional[str] = None  # Intent type for intent_action messages
    action: Optional[dict] = field(default=None)  # Action payload for intent_action messages
    confidence: Optional[float] = None  # Intent confidence score
    gesture: Optional[dict] = field(default=None)  # Wizard gesture for intent_action messages

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {"type": self.type}
        if self.data is not None:
            result["data"] = self.data
        if self.text is not None:
            result["text"] = self.text
        if self.language is not None:
            result["language"] = self.language
        if self.conversation_id is not None:
            result["conversation_id"] = self.conversation_id
        if self.escalation_needed is not None:
            result["escalation_needed"] = self.escalation_needed
        if self.message is not None:
            result["message"] = self.message
        if self.intent is not None:
            result["intent"] = self.intent
        if self.action is not None:
            result["action"] = self.action
        if self.confidence is not None:
            result["confidence"] = self.confidence
        if self.gesture is not None:
            result["gesture"] = self.gesture
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "PipelineMessage":
        """Create from dictionary."""
        return cls(
            type=data.get("type", "unknown"),
            data=data.get("data"),
            text=data.get("text"),
            language=data.get("language"),
            conversation_id=data.get("conversation_id"),
            escalation_needed=data.get("escalation_needed"),
            message=data.get("message"),
            intent=data.get("intent"),
            action=data.get("action"),
            confidence=data.get("confidence"),
            gesture=data.get("gesture"),
        )


class VoicePipelineService:
    """
    Orchestrates the complete voice interaction pipeline.

    Flow:
    1. Client streams audio chunks via WebSocket
    2. Audio is forwarded to ElevenLabs Realtime STT
    3. When transcript is committed (VAD detects end of speech):
       a. Send transcript to Claude streaming API
       b. Stream Claude tokens to ElevenLabs TTS
       c. Stream TTS audio back to client
    4. Client plays audio as chunks arrive

    Expected latency breakdown:
    - STT: ~150ms (after voice activity ends)
    - LLM first token: ~100-300ms
    - TTS first audio: ~300-500ms after first LLM token
    - Total: ~600-1000ms from end of speech to first audio
    """

    def __init__(
        self,
        user: User,
        language: str = "auto",
        conversation_id: Optional[str] = None,
        voice_id: Optional[str] = None,
    ):
        """
        Initialize the voice pipeline.

        Args:
            user: Authenticated user for the session
            language: Language hint for STT ("auto" for detection)
            conversation_id: Existing conversation to continue
            voice_id: Voice ID for TTS (defaults to configured voice)
        """
        self.user = user
        self.language = language
        self.conversation_id = conversation_id
        # Use Olorin's voice (Adam - deep, authoritative male) for support system
        self.voice_id = voice_id or settings.ELEVENLABS_SUPPORT_VOICE_ID

        # Service instances
        self.stt_service: Optional[ElevenLabsRealtimeService] = None
        self.tts_service: Optional[ElevenLabsTTSStreamingService] = None

        # State
        self._running = False
        self._current_transcript = ""
        self._detected_language = language

        # Output queue for messages to send to client
        self._output_queue: asyncio.Queue[PipelineMessage] = asyncio.Queue()

        # Tasks
        self._stt_task: Optional[asyncio.Task] = None
        self._llm_tts_task: Optional[asyncio.Task] = None

        logger.info(f"VoicePipelineService initialized for user {user.id}")

    async def start(self) -> None:
        """Start the voice pipeline services."""
        if self._running:
            logger.warning("Pipeline already running")
            return

        try:
            # Initialize STT service
            self.stt_service = ElevenLabsRealtimeService()
            await self.stt_service.connect(source_lang=self.language)

            self._running = True

            # Start listening for transcripts
            self._stt_task = asyncio.create_task(self._process_transcripts())

            logger.info("✅ Voice pipeline started")

        except Exception as e:
            logger.error(f"Failed to start voice pipeline: {e}")
            await self.stop()
            raise

    async def stop(self) -> None:
        """Stop the voice pipeline and cleanup."""
        self._running = False

        # Cancel tasks
        if self._stt_task:
            self._stt_task.cancel()
            try:
                await self._stt_task
            except asyncio.CancelledError:
                pass

        if self._llm_tts_task:
            self._llm_tts_task.cancel()
            try:
                await self._llm_tts_task
            except asyncio.CancelledError:
                pass

        # Close services
        if self.stt_service:
            await self.stt_service.close()
            self.stt_service = None

        if self.tts_service:
            await self.tts_service.close()
            self.tts_service = None

        logger.info("Voice pipeline stopped")

    async def process_audio_chunk(self, audio_data: bytes) -> None:
        """
        Process an incoming audio chunk from the client.

        Args:
            audio_data: Raw PCM audio bytes (16kHz, mono, 16-bit signed)
        """
        if not self._running or not self.stt_service:
            return

        await self.stt_service.send_audio_chunk(audio_data)

    async def commit_audio(self) -> None:
        """Signal that the user has finished speaking (manual commit)."""
        if not self.stt_service or not self.stt_service.websocket:
            return

        try:
            # Send commit signal to STT
            await self.stt_service.websocket.send(
                json.dumps({"message_type": "commit"})
            )
            logger.info("📤 Sent manual commit signal to STT")
        except Exception as e:
            logger.error(f"Error sending commit: {e}")

    async def cancel(self) -> None:
        """Cancel current voice interaction."""
        logger.info("🚫 Voice interaction cancelled")

        # Cancel any ongoing LLM/TTS task
        if self._llm_tts_task and not self._llm_tts_task.done():
            self._llm_tts_task.cancel()

        # Clear current transcript
        self._current_transcript = ""

        # Send cancellation to client
        await self._output_queue.put(PipelineMessage(type="cancelled"))

    async def _process_transcripts(self) -> None:
        """Background task to process incoming transcripts from STT."""
        if not self.stt_service:
            return

        try:
            async for (
                transcript,
                detected_lang,
            ) in self.stt_service.receive_transcripts():
                if not self._running:
                    break

                self._current_transcript = transcript
                self._detected_language = detected_lang

                # Send partial transcript to client
                await self._output_queue.put(
                    PipelineMessage(
                        type="transcript_final",
                        text=transcript,
                        language=detected_lang,
                    )
                )

                # Start LLM → TTS pipeline
                if self._llm_tts_task and not self._llm_tts_task.done():
                    # Cancel previous task if still running
                    self._llm_tts_task.cancel()
                    try:
                        await self._llm_tts_task
                    except asyncio.CancelledError:
                        pass

                self._llm_tts_task = asyncio.create_task(
                    self._process_llm_tts(transcript, detected_lang)
                )

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error processing transcripts: {e}")
            await self._output_queue.put(
                PipelineMessage(
                    type="error",
                    message=str(e),
                )
            )

    async def _try_intent_classification(
        self, transcript: str, language: str
    ) -> Optional[VoiceResponse]:
        """
        Classify transcript intent using IntentRouter.
        Returns VoiceResponse for actionable intents, None for CHAT.
        """
        try:
            router = IntentRouter(
                language=language,
                user_id=str(self.user.id),
                conversation_id=self.conversation_id,
            )
            intent, confidence = router._classify_intent(transcript)

            if intent != VoiceIntent.CHAT:
                logger.info(
                    "Intent classified - short-circuiting LLM",
                    extra={
                        "intent": intent.value,
                        "confidence": confidence,
                        "transcript": transcript,
                    },
                )
                voice_response = await router.process_and_route(transcript)
                return voice_response

            return None
        except Exception as exc:
            logger.error(
                "Intent classification failed, falling through to LLM",
                extra={"error": str(exc)},
            )
            return None

    async def _send_intent_action(self, voice_response: VoiceResponse) -> None:
        """
        Speak the intent response via TTS and send the intent_action
        and complete messages immediately after the last audio chunk.
        """
        try:
            self.tts_service = ElevenLabsTTSStreamingService()

            async def single_text_generator():
                yield voice_response.spoken_response

            audio_chunk_count = 0
            async for audio_chunk in self.tts_service.synthesize_streaming(
                single_text_generator(),
                voice_id=self.voice_id,
            ):
                audio_chunk_count += 1
                audio_b64 = base64.b64encode(audio_chunk).decode("utf-8")
                await self._output_queue.put(
                    PipelineMessage(type="tts_audio", data=audio_b64)
                )

            logger.info(
                "Intent TTS complete",
                extra={"audio_chunks": audio_chunk_count},
            )

            # Send intent_action and complete immediately after last audio chunk.
            # synthesize_streaming() no longer blocks on WebSocket close,
            # so these messages reach the client without delay.
            await self._output_queue.put(
                PipelineMessage(
                    type="intent_action",
                    text=voice_response.spoken_response,
                    intent=voice_response.intent,
                    action=(
                        voice_response.action.model_dump()
                        if voice_response.action
                        else None
                    ),
                    confidence=voice_response.confidence,
                    gesture=(
                        voice_response.gesture.model_dump()
                        if voice_response.gesture
                        else None
                    ),
                )
            )

            await self._output_queue.put(
                PipelineMessage(
                    type="complete",
                    conversation_id=self.conversation_id,
                    escalation_needed=False,
                )
            )
        except Exception as exc:
            logger.error(
                "Intent action send failed",
                extra={"error": str(exc)},
            )
            raise
        finally:
            if self.tts_service:
                await self.tts_service.close()
                self.tts_service = None

    async def _process_llm_tts(self, transcript: str, language: str) -> None:
        """
        Process transcript through LLM and stream response to TTS.
        First attempts intent classification to short-circuit the LLM
        for actionable commands (navigation, playback, etc.).

        Args:
            transcript: The transcribed user speech
            language: Detected language code
        """
        logger.info(
            "Processing voice transcript",
            extra={"transcript": transcript, "language": language},
        )

        # Intent classification gate
        intent_response = await self._try_intent_classification(
            transcript, language
        )
        if intent_response:
            try:
                await self._send_intent_action(intent_response)
            except Exception as exc:
                logger.error(
                    "Intent action failed, falling through to LLM",
                    extra={"error": str(exc)},
                )
            else:
                return  # Only skip LLM if intent action succeeded

        try:
            # Initialize TTS service (synthesize_streaming handles connect internally)
            self.tts_service = ElevenLabsTTSStreamingService()

            # Create async generator for LLM text chunks
            llm_text_queue: asyncio.Queue[Optional[str]] = asyncio.Queue()
            completion_data: dict = {}

            async def llm_text_generator() -> AsyncIterator[str]:
                """Yield text chunks from LLM for TTS."""
                while True:
                    chunk = await llm_text_queue.get()
                    if chunk is None:
                        break
                    yield chunk

            # Start LLM streaming in background
            async def stream_llm():
                try:
                    async for chunk in support_service.chat_streaming(
                        message=transcript,
                        user=self.user,
                        language=language,
                        conversation_id=self.conversation_id,
                        is_voice=True,
                    ):
                        chunk_type = chunk.get("type")

                        if chunk_type == "chunk":
                            text = chunk.get("text", "")
                            if text:
                                # Send to TTS
                                await llm_text_queue.put(text)
                                # Send to client for display
                                await self._output_queue.put(
                                    PipelineMessage(
                                        type="llm_chunk",
                                        text=text,
                                    )
                                )

                        elif chunk_type == "complete":
                            # Store completion data
                            completion_data.update(chunk)
                            self.conversation_id = chunk.get("conversation_id")

                        elif chunk_type == "error":
                            await self._output_queue.put(
                                PipelineMessage(
                                    type="error",
                                    message=chunk.get("message", "LLM error"),
                                )
                            )

                except Exception as e:
                    logger.error(f"LLM streaming error: {e}")
                    await self._output_queue.put(
                        PipelineMessage(
                            type="error",
                            message=str(e),
                        )
                    )
                finally:
                    # Signal end of text stream
                    await llm_text_queue.put(None)

            # Start LLM task
            llm_task = asyncio.create_task(stream_llm())

            # Stream TTS audio as it's generated
            audio_chunk_count = 0
            async for audio_chunk in self.tts_service.synthesize_streaming(
                llm_text_generator(),
                voice_id=self.voice_id,
            ):
                audio_chunk_count += 1
                # Encode audio and send to client
                audio_b64 = base64.b64encode(audio_chunk).decode("utf-8")
                await self._output_queue.put(
                    PipelineMessage(
                        type="tts_audio",
                        data=audio_b64,
                    )
                )

            # Wait for LLM task to complete
            await llm_task

            logger.info(f"Streamed {audio_chunk_count} audio chunks")

            # Send completion immediately after last audio chunk.
            await self._output_queue.put(
                PipelineMessage(
                    type="complete",
                    conversation_id=self.conversation_id,
                    escalation_needed=completion_data.get("escalation_needed", False),
                )
            )

        except asyncio.CancelledError:
            logger.info("LLM/TTS task cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in LLM/TTS pipeline: {e}")
            await self._output_queue.put(
                PipelineMessage(
                    type="error",
                    message=str(e),
                )
            )
        finally:
            if self.tts_service:
                await self.tts_service.close()
                self.tts_service = None

    async def receive_messages(self) -> AsyncIterator[PipelineMessage]:
        """
        Async iterator to receive pipeline output messages.

        Yields:
            PipelineMessage objects to send to the client
        """
        while self._running or not self._output_queue.empty():
            try:
                message = await asyncio.wait_for(self._output_queue.get(), timeout=0.5)
                yield message
            except asyncio.TimeoutError:
                if not self._running and self._output_queue.empty():
                    break
                continue
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break

    @property
    def is_running(self) -> bool:
        """Check if pipeline is running."""
        return self._running

    @property
    def current_conversation_id(self) -> Optional[str]:
        """Get current conversation ID."""
        return self.conversation_id
