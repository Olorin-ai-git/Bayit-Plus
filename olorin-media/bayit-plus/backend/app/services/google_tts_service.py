"""
Google Cloud Text-to-Speech Service
For languages like Hebrew that ElevenLabs doesn't properly support
"""

import logging
from pathlib import Path
from typing import Optional

from google.cloud import texttospeech

logger = logging.getLogger(__name__)


class GoogleTTSService:
    """Google Cloud TTS service for proper Hebrew (and other language) support"""

    def __init__(self):
        """Initialize Google TTS client"""
        self.client = texttospeech.TextToSpeechClient()
        logger.info("GoogleTTSService initialized")

    async def generate_audio(
        self,
        text: str,
        language_code: str = "he-IL",
        voice_name: Optional[str] = None,
        gender: str = "MALE",
        output_path: Optional[str] = None,
    ) -> bytes:
        """
        Generate audio from text using Google Cloud TTS.
        Handles long texts by chunking (Google TTS has 5000 byte limit).

        Args:
            text: Text to convert to speech
            language_code: Language code (e.g., "he-IL" for Hebrew)
            voice_name: Specific voice name (e.g., "he-IL-Wavenet-B")
                       If not provided, will use gender to select voice
            gender: Voice gender ("MALE" or "FEMALE")
            output_path: Optional path to save audio file

        Returns:
            Audio bytes (MP3 format)
        """
        logger.info(f"Generating TTS for {len(text)} characters in {language_code}")

        # Set up voice parameters
        if voice_name:
            voice = texttospeech.VoiceSelectionParams(
                language_code=language_code,
                name=voice_name,
            )
            logger.info(f"Using specified voice: {voice_name}")
        else:
            # Auto-select voice based on gender
            ssml_gender = (
                texttospeech.SsmlVoiceGender.MALE
                if gender.upper() == "MALE"
                else texttospeech.SsmlVoiceGender.FEMALE
            )

            voice = texttospeech.VoiceSelectionParams(
                language_code=language_code,
                ssml_gender=ssml_gender,
            )
            logger.info(f"Auto-selecting {gender} voice for {language_code}")

        # Set audio configuration
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.0,  # Normal speed
            pitch=0.0,  # Normal pitch
        )

        # Google TTS has a 5000 byte limit - chunk text if needed
        max_bytes = 4500  # Leave some margin
        text_bytes = text.encode("utf-8")

        if len(text_bytes) <= max_bytes:
            # Single request
            synthesis_input = texttospeech.SynthesisInput(text=text)

            response = self.client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config,
            )

            audio_content = response.audio_content
            logger.info(
                f"✅ Generated {len(audio_content)} bytes of audio (single chunk)"
            )
        else:
            # Multiple requests needed - chunk by sentences
            logger.info(f"Text is {len(text_bytes)} bytes - chunking...")

            # Split by sentences (look for period, question mark, exclamation)
            import re

            sentences = re.split(r"([.!?]+\s*)", text)

            # Recombine sentences with their punctuation
            chunks = []
            current_chunk = ""
            current_bytes = 0

            for i in range(0, len(sentences), 2):
                sentence = sentences[i]
                punct = sentences[i + 1] if i + 1 < len(sentences) else ""
                combined = sentence + punct

                combined_bytes = combined.encode("utf-8")
                if current_bytes + len(combined_bytes) > max_bytes and current_chunk:
                    # Save current chunk and start new one
                    chunks.append(current_chunk)
                    current_chunk = combined
                    current_bytes = len(combined_bytes)
                else:
                    current_chunk += combined
                    current_bytes += len(combined_bytes)

            if current_chunk:
                chunks.append(current_chunk)

            logger.info(f"Split into {len(chunks)} chunks")

            # Generate audio for each chunk
            audio_parts = []
            for i, chunk in enumerate(chunks):
                logger.info(
                    f"Generating chunk {i+1}/{len(chunks)} ({len(chunk)} chars)..."
                )

                synthesis_input = texttospeech.SynthesisInput(text=chunk)

                response = self.client.synthesize_speech(
                    input=synthesis_input,
                    voice=voice,
                    audio_config=audio_config,
                )

                audio_parts.append(response.audio_content)

            # Concatenate all audio parts
            audio_content = b"".join(audio_parts)
            logger.info(
                f"✅ Generated {len(audio_content)} bytes of audio ({len(chunks)} chunks)"
            )

        # Save to file if path provided
        if output_path:
            Path(output_path).write_bytes(audio_content)
            logger.info(f"Saved audio to: {output_path}")

        return audio_content

    def get_hebrew_male_voice(self) -> str:
        """Get recommended Hebrew male voice"""
        # Wavenet voices are highest quality
        return "he-IL-Wavenet-B"

    def get_hebrew_female_voice(self) -> str:
        """Get recommended Hebrew female voice"""
        return "he-IL-Wavenet-A"
