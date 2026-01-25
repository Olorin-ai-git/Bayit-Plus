"""
Resume translation from transcription step (skip download + vocal separation)
"""
import asyncio
import logging
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# Set up detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def resume_translation():
    """Resume translation from transcription step using existing separated vocals"""
    from app.core.config import settings
    from app.models.content import PodcastEpisode
    from app.services.podcast_translation_service import PodcastTranslationService
    from app.services.google_speech_service import GoogleSpeechService
    from app.services.translation_service import TranslationService
    from app.services.elevenlabs_tts_streaming_service import ElevenLabsTTSStreamingService
    from app.services.audio_processing_service import AudioProcessingService
    from app.core.storage import StorageService
    from datetime import datetime

    # Initialize database
    logger.info("Initializing database connection...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get the episode
    logger.info("Fetching Tucker Carlson episode...")
    episode = await PodcastEpisode.get('697439f1e0501bc53693246c')

    if not episode:
        logger.error("Episode not found!")
        return

    logger.info(f"Episode: {episode.title}")

    # Use the most recent separated vocals
    vocals_path = "/tmp/podcast_audio/697439f1e0501bc53693246c/htdemucs_6s/2f66fc72-67a5-4b6f-a5db-853b87b95891/vocals.wav"
    background_path = "/tmp/podcast_audio/697439f1e0501bc53693246c/htdemucs_6s/2f66fc72-67a5-4b6f-a5db-853b87b95891/no_vocals.wav"

    if not Path(vocals_path).exists():
        logger.error(f"Vocals file not found: {vocals_path}")
        return

    logger.info(f"✅ Using existing separated vocals: {vocals_path}")
    logger.info(f"✅ Using existing background: {background_path}")

    # Initialize services
    logger.info("Initializing services...")
    stt_service = GoogleSpeechService()
    translation_service = TranslationService()
    tts_service = ElevenLabsTTSStreamingService()
    audio_processor = AudioProcessingService(temp_dir=settings.TEMP_AUDIO_DIR)
    storage = StorageService()

    try:
        # Update status to processing
        await PodcastEpisode.find_one({"_id": episode.id}).update({
            "$set": {
                "translation_status": "processing",
                "updated_at": datetime.utcnow(),
            }
        })

        # Step 3: Transcribe vocals using Google Speech
        logger.info("=" * 80)
        logger.info("Step 3/8: Transcribing vocals with Google Speech-to-Text")
        logger.info("=" * 80)
        text, detected_lang = await stt_service.transcribe_audio_file(vocals_path)
        logger.info(f"✅ Transcribed {len(text)} characters, language: {detected_lang}")

        # Step 4: Translate to Hebrew
        logger.info("=" * 80)
        logger.info("Step 4/8: Translating to Hebrew")
        logger.info("=" * 80)
        target_lang = "he" if detected_lang == "en-US" else "en"
        translated_text = await translation_service.translate_text(
            text=text, target_language_code=target_lang
        )
        logger.info(f"✅ Translated {len(translated_text)} characters")

        # Step 5: Generate Hebrew TTS
        logger.info("=" * 80)
        logger.info("Step 5/8: Generating Hebrew text-to-speech")
        logger.info("=" * 80)
        temp_dir = Path(settings.TEMP_AUDIO_DIR) / str(episode.id)
        temp_dir.mkdir(parents=True, exist_ok=True)

        hebrew_vocals_path = str(temp_dir / f"vocals_{target_lang}.mp3")

        voice_id = settings.ELEVENLABS_HEBREW_VOICE_ID if target_lang == "he" else settings.ELEVENLABS_ENGLISH_VOICE_ID
        voice_settings = {
            "stability": settings.ELEVENLABS_STABILITY,
            "similarity_boost": settings.ELEVENLABS_SIMILARITY_BOOST,
            "style": settings.ELEVENLABS_STYLE,
            "use_speaker_boost": settings.ELEVENLABS_SPEAKER_BOOST,
        }

        async with tts_service.stream_text_to_speech(
            voice_id=voice_id,
            text=translated_text,
            model=settings.ELEVENLABS_MODEL,
            voice_settings=voice_settings,
            output_format="mp3_44100_128",
        ) as stream:
            await stream.save(hebrew_vocals_path)

        logger.info(f"✅ Generated TTS audio: {hebrew_vocals_path}")

        # Step 6: Mix Hebrew vocals with original background
        logger.info("=" * 80)
        logger.info("Step 6/8: Mixing Hebrew vocals with background music")
        logger.info("=" * 80)
        final_audio_path = str(temp_dir / f"final_{target_lang}.mp3")
        await audio_processor.mix_audio(
            vocals_path=hebrew_vocals_path,
            background_path=background_path,
            output_path=final_audio_path
        )
        logger.info(f"✅ Mixed audio: {final_audio_path}")

        # Step 7: Upload to GCS
        logger.info("=" * 80)
        logger.info("Step 7/8: Uploading to Google Cloud Storage")
        logger.info("=" * 80)
        gcs_path = f"podcasts/translations/{episode.id}/{target_lang}.mp3"
        translated_url = await storage.upload_file(final_audio_path, gcs_path)
        logger.info(f"✅ Uploaded to: {translated_url}")

        # Step 8: Update database
        logger.info("=" * 80)
        logger.info("Step 8/8: Updating database")
        logger.info("=" * 80)

        translation_data = {
            "language": target_lang,
            "audio_url": translated_url,
            "transcript": text,
            "translated_text": translated_text,
            "voice_id": voice_id,
            "duration": str(await audio_processor.get_audio_duration(final_audio_path)),
            "created_at": datetime.utcnow(),
            "file_size": Path(final_audio_path).stat().st_size,
        }

        await PodcastEpisode.find_one({"_id": episode.id}).update({
            "$set": {
                f"translations.{target_lang}": translation_data,
                "available_languages": [detected_lang.replace("-US", ""), target_lang],
                "original_language": detected_lang.replace("-US", ""),
                "translation_status": "completed",
                "updated_at": datetime.utcnow(),
                "retry_count": 0,
            }
        })

        logger.info("=" * 80)
        logger.info("✅✅✅ TRANSLATION COMPLETED SUCCESSFULLY! ✅✅✅")
        logger.info("=" * 80)
        logger.info(f"Hebrew audio URL: {translated_url}")
        logger.info(f"Original language: {detected_lang}")
        logger.info(f"Target language: {target_lang}")

    except Exception as e:
        logger.error(f"❌ Translation failed: {e}")
        logger.exception("Full traceback:")

        # Update status to failed
        await PodcastEpisode.find_one({"_id": episode.id}).update({
            "$set": {
                "translation_status": "failed",
                "updated_at": datetime.utcnow(),
            },
            "$inc": {"retry_count": 1},
        })

    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(resume_translation())
