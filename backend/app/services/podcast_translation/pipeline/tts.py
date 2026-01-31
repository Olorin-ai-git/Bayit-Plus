"""TTS generation with ElevenLabs and Google fallback."""
import asyncio
import logging
from pathlib import Path

from app.services.elevenlabs_tts_streaming_service import \
    ElevenLabsTTSStreamingService
from app.services.google_tts_service import GoogleTTSService

from ..constants import get_voice_id

logger = logging.getLogger(__name__)


async def generate_tts(
    text: str,
    language: str,
    output_path: str,
    gender: str,
    tts_service: ElevenLabsTTSStreamingService,
) -> str:
    """
    Generate TTS audio for translated text.

    Args:
        text: Text to convert to speech
        language: Target language code
        output_path: Path to save generated audio
        gender: Voice gender ('male' or 'female')
        tts_service: ElevenLabs TTS service

    Returns:
        Path to generated audio file
    """
    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # CRITICAL: Use Google TTS for Hebrew (ElevenLabs doesn't support Hebrew properly)
    # ElevenLabs produces gibberish for Hebrew, sounds like Farsi/Breton, not Hebrew
    if language == "he":
        logger.info(
            f"Using Google Cloud TTS for Hebrew ({gender}) - {len(text)} characters"
        )
        return await _generate_tts_google(text, language, gender, output_path)

    # Use ElevenLabs for other languages
    voice_id = get_voice_id(language, gender)
    logger.info(
        f"Generating TTS with voice {voice_id} ({gender}) for {len(text)} characters (language: {language})"
    )

    # Use ElevenLabs multilingual v2 model
    model_id = "eleven_multilingual_v2"

    # Connect with multilingual model and language code
    await tts_service.connect(
        voice_id=voice_id,
        model_id=model_id,
        output_format="mp3_44100_128",
        language_code=language,
    )
    logger.info(
        f"Connected to ElevenLabs TTS (model: {model_id}, voice: {voice_id}, language: {language})"
    )

    # Create async text stream from full text
    async def text_stream():
        # Split text into chunks for streaming (optimal chunk size for ElevenLabs)
        chunk_size = 500  # Characters per chunk
        for i in range(0, len(text), chunk_size):
            chunk = text[i : i + chunk_size]
            yield chunk
            await asyncio.sleep(0.1)  # Small delay between chunks

    # Collect audio chunks
    audio_chunks = []
    logger.info("Starting to collect TTS audio chunks...")
    chunk_count = 0

    # Stream text and collect audio (connection already established above)
    async def send_text():
        text_count = 0
        try:
            async for text_chunk in text_stream():
                if not tts_service._running:
                    break
                await tts_service.send_text_chunk(text_chunk)
                text_count += 1
            await tts_service.finish_stream()
            logger.info(f"Sent {text_count} text chunks to TTS")
        except Exception as e:
            logger.error(f"Error sending text to TTS: {e}")

    # Start sending task and receive audio concurrently
    sender_task = asyncio.create_task(send_text())

    try:
        async for audio_chunk in tts_service.receive_audio():
            audio_chunks.append(audio_chunk)
            chunk_count += 1
            if chunk_count % 100 == 0:
                logger.info(f"Received {chunk_count} audio chunks...")

        await sender_task
    finally:
        if not sender_task.done():
            sender_task.cancel()
            try:
                await sender_task
            except asyncio.CancelledError:
                pass
        await tts_service.close()

    logger.info(
        f"Received all {len(audio_chunks)} audio chunks, writing to file..."
    )

    # Write all audio chunks to file
    with open(output_path, "wb") as f:
        for chunk in audio_chunks:
            f.write(chunk)

    logger.info(
        f"TTS audio generated: {output_path} ({len(audio_chunks)} chunks, {Path(output_path).stat().st_size} bytes)"
    )
    return output_path


async def _generate_tts_google(
    text: str, language: str, gender: str, output_path: str
) -> str:
    """
    Generate TTS using Google Cloud TTS (for Hebrew and other languages ElevenLabs doesn't support).

    Args:
        text: Text to convert to speech
        language: Language code ('he' for Hebrew)
        gender: Voice gender ('male' or 'female')
        output_path: Path to save generated audio

    Returns:
        Path to generated audio file
    """
    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Get Google TTS voice name based on language and gender
    if language == "he":
        # Hebrew voices
        if gender == "male":
            voice_name = "he-IL-Wavenet-B"  # Male Wavenet (highest quality)
        else:
            voice_name = "he-IL-Wavenet-A"  # Female Wavenet
    else:
        # For other languages, let Google auto-select
        voice_name = None

    logger.info(
        f"Generating Google TTS: {len(text)} chars, language: {language}, voice: {voice_name}"
    )

    # Create Google TTS service
    google_tts = GoogleTTSService()

    # Generate audio
    audio_bytes = await google_tts.generate_audio(
        text=text,
        language_code=f"{language}-IL" if language == "he" else language,
        voice_name=voice_name,
        gender=gender.upper(),
    )

    # Write to file
    Path(output_path).write_bytes(audio_bytes)

    logger.info(
        f"✅ Google TTS audio generated: {output_path} ({len(audio_bytes)} bytes)"
    )

    return output_path
