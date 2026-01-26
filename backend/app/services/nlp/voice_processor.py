"""
Voice Processor - Process voice commands using STT and agent execution.

Integrates existing STT services (Whisper, Google Speech) with NLP agent executor
to enable voice-controlled workflows.
"""

import logging
from io import BytesIO
from typing import Optional

from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.nlp.agent_executor import AgentExecutionResult, AgentExecutor

logger = logging.getLogger(__name__)


class VoiceCommandResult(BaseModel):
    """Result of voice command processing."""

    transcript: str = Field(description="Transcribed text from audio")
    execution_result: AgentExecutionResult = Field(description="Result of agent execution")
    voice_response: Optional[bytes] = Field(default=None, description="Optional TTS audio response")


class VoiceProcessor:
    """Process voice commands using STT and agent execution."""

    async def process_voice_command(
        self,
        audio_data: bytes,
        platform: str = "bayit",
        language: str = "en",
        dry_run: bool = False
    ) -> VoiceCommandResult:
        """
        Process voice command: STT → Agent execution → Optional TTS.

        Steps:
        1. Transcribe audio using configured STT provider
        2. Parse command using agent executor
        3. Execute workflow
        4. Generate optional voice response

        Args:
            audio_data: Audio bytes (WAV, MP3, etc.)
            platform: Target platform ("bayit", "fraud", "cvplus")
            language: Language code ("en", "he", "es", etc.)
            dry_run: If True, preview without executing

        Returns:
            VoiceCommandResult with transcript and execution results

        Example:
            >>> processor = VoiceProcessor()
            >>> with open("command.wav", "rb") as f:
            ...     audio = f.read()
            >>> result = await processor.process_voice_command(audio, platform="bayit")
            >>> print(f"Heard: {result.transcript}")
            >>> print(f"Result: {result.execution_result.summary}")
        """
        logger.info(f"Processing voice command (platform: {platform}, language: {language})")

        # Step 1: Transcribe audio
        transcript = await self._transcribe_audio(audio_data, language)

        if not transcript:
            raise ValueError("Failed to transcribe audio - no speech detected")

        logger.info(f"Transcribed: '{transcript}'")

        # Step 2: Execute agent workflow
        executor = AgentExecutor()
        execution_result = await executor.execute(
            query=transcript,
            platform=platform,
            dry_run=dry_run,
            max_iterations=settings.AGENT_MAX_ITERATIONS,
            budget_limit_usd=settings.AGENT_BUDGET_LIMIT_USD
        )

        # Step 3: Generate voice response (optional)
        voice_response = None
        if settings.VOICE_RESPONSE_ENABLED and execution_result.success:
            voice_response = await self._generate_voice_response(execution_result.summary)

        return VoiceCommandResult(
            transcript=transcript,
            execution_result=execution_result,
            voice_response=voice_response
        )

    async def _transcribe_audio(self, audio_data: bytes, language: str) -> str:
        """
        Transcribe audio using configured STT provider.

        Args:
            audio_data: Audio bytes
            language: Language code

        Returns:
            Transcribed text

        Raises:
            ValueError: If transcription fails
        """
        provider = settings.SPEECH_TO_TEXT_PROVIDER

        try:
            if provider == "whisper":
                return await self._transcribe_with_whisper(audio_data, language)
            elif provider == "google":
                return await self._transcribe_with_google(audio_data, language)
            elif provider == "elevenlabs":
                return await self._transcribe_with_elevenlabs(audio_data, language)
            else:
                raise ValueError(f"Unknown STT provider: {provider}")

        except Exception as e:
            logger.error(f"Transcription failed with {provider}: {e}")
            # Try fallback provider
            if provider != "whisper":
                logger.info("Trying Whisper as fallback")
                try:
                    return await self._transcribe_with_whisper(audio_data, language)
                except Exception as fallback_error:
                    logger.error(f"Fallback transcription failed: {fallback_error}")

            raise ValueError(f"Transcription failed: {str(e)}")

    async def _transcribe_with_whisper(self, audio_data: bytes, language: str) -> str:
        """Transcribe using OpenAI Whisper."""
        from app.services.whisper_transcription_service import WhisperService

        service = WhisperService()

        # Save audio to temporary file (Whisper requires file)
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name

        try:
            result = await service.transcribe_audio_file(
                audio_file_path=temp_path,
                language=language
            )
            return result.get("text", "")
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    async def _transcribe_with_google(self, audio_data: bytes, language: str) -> str:
        """Transcribe using Google Cloud Speech."""
        from app.services.google_speech_service import GoogleSpeechService

        service = GoogleSpeechService()

        # Save audio to temporary file
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name

        try:
            result = await service.transcribe_audio_file(
                audio_file_path=temp_path,
                language_code=language
            )
            return result.get("transcript", "")
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    async def _transcribe_with_elevenlabs(self, audio_data: bytes, language: str) -> str:
        """Transcribe using ElevenLabs Scribe."""
        # Placeholder for ElevenLabs STT integration
        # Would use ElevenLabs Scribe v2 API when available
        logger.warning("ElevenLabs STT not yet implemented, falling back to Whisper")
        return await self._transcribe_with_whisper(audio_data, language)

    async def _generate_voice_response(self, text: str) -> Optional[bytes]:
        """
        Generate voice response using ElevenLabs TTS.

        Args:
            text: Text to speak

        Returns:
            Audio bytes (MP3) or None if TTS fails
        """
        try:
            from app.services.elevenlabs_tts_streaming_service import ElevenLabsTTSService

            service = ElevenLabsTTSService()

            # Use configured voice for CLI responses
            voice_id = settings.TTS_VOICE_ID or settings.ELEVENLABS_DEFAULT_VOICE_ID

            # Generate speech (streaming service returns audio data)
            audio_data = await service.generate_audio(
                text=text,
                voice_id=voice_id,
                optimize_streaming_latency=3  # Medium latency optimization
            )

            logger.info(f"Generated voice response ({len(audio_data)} bytes)")
            return audio_data

        except Exception as e:
            logger.error(f"Voice response generation failed: {e}")
            return None
