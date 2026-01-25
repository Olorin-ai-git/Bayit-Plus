"""
Translate 2 minutes using Whisper directly on original audio (NO vocal separation)
This tests if transcription quality improves when we don't separate vocals
"""
import asyncio
import os
import shutil
import subprocess
from pathlib import Path
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.services.whisper_transcription_service import WhisperTranscriptionService
from app.services.elevenlabs_tts_streaming_service import ElevenLabsTTSStreamingService
from app.services.audio_processing_service import AudioProcessingService
from app.core.storage import StorageService
from app.services.olorin.dubbing.translation import TranslationProvider
from app.core.config import settings
import logging
import httpx

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def download_audio(url: str, output_path: str) -> str:
    """Download audio file from URL"""
    async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
        response = await client.get(url)
        response.raise_for_status()

        with open(output_path, 'wb') as f:
            f.write(response.content)

        return output_path

async def trim_audio(input_path: str, output_path: str, duration_seconds: int) -> None:
    """Trim audio to specified duration"""
    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-t", str(duration_seconds),
        "-c", "copy",
        "-y",
        output_path
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode() if stderr else "Unknown error"
        raise RuntimeError(f"FFmpeg trim failed: {error_msg}")

async def translate_2min_whisper_original():
    """Translate 2 minutes using Whisper on ORIGINAL audio (no separation)"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    logger.info("=" * 80)
    logger.info("Tucker Carlson - 2 Minute Translation (WHISPER - NO VOCAL SEPARATION)")
    logger.info("=" * 80)
    logger.info("Duration: First 2 minutes (120 seconds)")
    logger.info("STT: OpenAI Whisper on ORIGINAL audio (no vocal separation)")
    logger.info("TTS: ElevenLabs Rachel (female multilingual)")
    logger.info("=" * 80)
    logger.info("")

    temp_dir = Path("/tmp/podcast_audio") / str(episode.id)
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Step 1: Download original audio
        logger.info("Step 1/6: Downloading original audio...")
        download_path = str(temp_dir / "original.mp3")
        await download_audio(episode.audio_url, download_path)
        logger.info(f"✅ Downloaded: {os.path.getsize(download_path) / 1024 / 1024:.2f} MB")

        # Step 2: Trim to 2 minutes
        logger.info("Step 2/6: Trimming to 2 minutes...")
        trimmed_path = str(temp_dir / "trimmed.mp3")
        await trim_audio(download_path, trimmed_path, 120)
        logger.info(f"✅ Trimmed: {os.path.getsize(trimmed_path) / 1024 / 1024:.2f} MB")

        # Step 3: Transcribe with Whisper (no vocal separation!)
        logger.info("Step 3/6: Transcribing with Whisper (on original audio)...")
        whisper = WhisperTranscriptionService()
        transcript, detected_lang = await whisper.transcribe_audio_file(trimmed_path)
        logger.info(f"✅ Transcribed: {len(transcript)} characters, language: {detected_lang}")
        logger.info(f"First 200 chars: {transcript[:200]}...")

        # Step 4: Translate to Hebrew
        logger.info("Step 4/6: Translating to Hebrew...")
        # Map Whisper language names to ISO codes
        lang_map = {
            "english": "en",
            "hebrew": "he",
            "spanish": "es",
            "french": "fr",
            "en": "en",
            "he": "he",
            "es": "es",
            "fr": "fr"
        }
        source_lang_code = lang_map.get(detected_lang.lower(), "en")
        target_lang = "he" if source_lang_code == "en" else "en"
        translation_provider = TranslationProvider(target_language=target_lang)
        await translation_provider.initialize()
        translated_text = await translation_provider.translate(text=transcript, source_lang=source_lang_code)
        logger.info(f"✅ Translated: {len(translated_text)} characters")
        logger.info(f"First 200 chars: {translated_text[:200]}...")

        # Step 5: Generate TTS
        logger.info("Step 5/6: Generating Hebrew TTS...")
        tts_service = ElevenLabsTTSStreamingService()
        voice_id = settings.ELEVENLABS_HEBREW_VOICE_ID

        await tts_service.connect(
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )

        # Stream text and collect audio
        async def text_stream():
            chunk_size = 500
            for i in range(0, len(translated_text), chunk_size):
                yield translated_text[i:i+chunk_size]
                await asyncio.sleep(0.1)

        audio_chunks = []
        async def send_text():
            chunk_count = 0
            async for text_chunk in text_stream():
                await tts_service.send_text_chunk(text_chunk)
                chunk_count += 1
            await tts_service.finish_stream()
            logger.info(f"Sent {chunk_count} text chunks")

        sender_task = asyncio.create_task(send_text())

        try:
            async for audio_chunk in tts_service.receive_audio():
                audio_chunks.append(audio_chunk)
            await sender_task
        finally:
            if not sender_task.done():
                sender_task.cancel()
            await tts_service.close()

        tts_path = str(temp_dir / "vocals_he.mp3")
        with open(tts_path, 'wb') as f:
            for chunk in audio_chunks:
                f.write(chunk)
        logger.info(f"✅ Generated TTS: {len(audio_chunks)} chunks, {os.path.getsize(tts_path) / 1024 / 1024:.2f} MB")

        # Step 6: Upload to storage
        logger.info("Step 6/6: Uploading to CDN...")
        storage = StorageService()
        cdn_path = f"podcasts/translations/{episode.id}/he_whisper_no_separation.mp3"
        cdn_url = await storage.upload_file(tts_path, cdn_path)
        logger.info(f"✅ Uploaded to: {cdn_url}")

        # Save results to database for comparison
        await PodcastEpisode.find_one({"_id": episode.id}).update({
            "$set": {
                f"translations.he_whisper_no_sep": {
                    "language": "he",
                    "audio_url": cdn_url,
                    "transcript": transcript,
                    "translated_text": translated_text,
                    "voice_id": voice_id,
                    "created_at": datetime.utcnow()
                }
            }
        })

        # Clean up temp files AFTER upload
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            logger.info("Cleaned up temp files")

        logger.info("")
        logger.info("=" * 80)
        logger.info("✅ WHISPER NO-SEPARATION TRANSLATION COMPLETE!")
        logger.info("=" * 80)
        logger.info(f"Audio URL: {cdn_url}")
        logger.info("")
        logger.info("Compare transcriptions:")
        logger.info("  poetry run python show_full_translation.py")
        logger.info("=" * 80)

    finally:
        pass  # Cleanup already handled above

    client.close()

if __name__ == "__main__":
    asyncio.run(translate_2min_whisper_original())
