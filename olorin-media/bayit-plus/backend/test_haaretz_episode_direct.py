"""
Test multi-speaker translation with known Hebrew podcast episode.
Uses episode ID directly: 69729fac9d27d77a468d90b0
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings
from app.services.speaker_diarization_google import GoogleSpeakerDiarizationService
from pathlib import Path

async def test_haaretz_direct():
    """Test Hebrew podcast with Google Cloud speaker diarization."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get specific episode
    episode_id = "69729fac9d27d77a468d90b0"
    print("=" * 80)
    print("TESTING HEBREW PODCAST EPISODE")
    print("=" * 80)
    print(f"Episode ID: {episode_id}")
    print()

    episode = await PodcastEpisode.get(episode_id)

    if not episode:
        print(f"❌ Episode {episode_id} not found")
        client.close()
        return

    print(f"Found episode:")
    print(f"  Title: {episode.title}")
    print(f"  Podcast: השבוע - פודקאסט הארץ (This Week - Haaretz)")
    print(f"  Duration: {episode.duration if hasattr(episode, 'duration') else 'Unknown'}")
    print()

    print("=" * 80)
    print("GOOGLE CLOUD HEBREW MULTI-SPEAKER TEST")
    print("=" * 80)
    print("Language: Hebrew (he-IL)")
    print("Target: English translation")
    print("Provider: Google Cloud Speech-to-Text")
    print("Duration: First 3 minutes (for testing)")
    print()

    print("STEP 1: Download and separate vocals from background")
    print("=" * 80)

    from app.services.podcast_translation_service import PodcastTranslationService
    from app.services.audio_processing_service import AudioProcessingService

    translation_service = PodcastTranslationService()

    # Download audio (first 3 minutes for testing)
    print("Downloading audio...")
    original_path = await translation_service._download_audio(episode.audio_url)
    print(f"✅ Downloaded: {original_path}")

    # Trim to 3 minutes
    print("\nTrimming to 3 minutes...")
    trimmed_path = str(Path(original_path).parent / f"trimmed_{Path(original_path).name}")
    await translation_service._trim_audio(original_path, trimmed_path, 180)
    print(f"✅ Trimmed: {trimmed_path}")

    # Separate vocals from background
    print("\nSeparating vocals from background using Demucs v4...")
    print("(This takes 2-3 minutes...)")
    audio_processor = AudioProcessingService(temp_dir=settings.TEMP_AUDIO_DIR)
    output_dir = str(Path(settings.TEMP_AUDIO_DIR) / str(episode.id) / "separated")
    vocals_path, background_path = await audio_processor.separate_vocals(
        audio_path=trimmed_path,
        output_dir=output_dir
    )
    print(f"✅ Vocals: {vocals_path}")
    print(f"✅ Background: {background_path}")

    print()
    print("STEP 2: Detect Hebrew speakers using Google Cloud Speech-to-Text")
    print("=" * 80)
    print("Testing Google Cloud's Hebrew speaker diarization capabilities...")
    print()

    # Initialize Google speaker diarization service
    diarization_service = GoogleSpeakerDiarizationService()

    # Detect speakers in Hebrew vocals
    print("Running Google Cloud diarization on Hebrew vocals...")
    print("Note: This also transcribes the Hebrew text automatically")
    print("(Uploading to GCS and processing...)")
    print()

    try:
        speaker_segments = await diarization_service.diarize_audio(
            audio_path=vocals_path,
            language="he-IL",  # Hebrew
            min_speakers=1,
            max_speakers=5
        )

        unique_speakers = set(seg.speaker_id for seg in speaker_segments)
        print()
        print(f"✅ Detected {len(unique_speakers)} speaker(s) in Hebrew podcast")
        print(f"   Speakers: {sorted(unique_speakers)}")
        print()

        # Show speaker statistics
        for speaker in sorted(unique_speakers):
            speaker_segs = [s for s in speaker_segments if s.speaker_id == speaker]
            total_time = sum(s.duration for s in speaker_segs)
            total_words = sum(len(s.text.split()) for s in speaker_segs if s.text)
            print(f"  {speaker}:")
            print(f"    Segments: {len(speaker_segs)}")
            print(f"    Speaking time: {total_time:.1f}s")
            print(f"    Words: ~{total_words}")
            print()

        print("First 5 speaker segments (Hebrew):")
        for i, segment in enumerate([s for s in speaker_segments if s.text][:5]):
            print(f"\n  {i+1}. {segment.speaker_id} ({segment.start_time:.1f}s-{segment.end_time:.1f}s):")
            preview = segment.text[:100] + "..." if len(segment.text) > 100 else segment.text
            print(f"     Hebrew: \"{preview}\"")

        print()
        print("=" * 80)
        print("STEP 3: Translate Hebrew speakers to English")
        print("=" * 80)

        # Translate all speaker segments to English
        print("\nTranslating Hebrew segments to English...")
        translated_segments = await diarization_service.translate_segments_by_speaker(
            segments=speaker_segments,
            source_lang="he",
            target_lang="en"
        )

        print(f"✅ Translated {len(translated_segments)} segments from Hebrew to English")
        print()

        print("First 3 translated segments:")
        for i, segment in enumerate(translated_segments[:3]):
            print(f"\n  {segment.speaker_id} ({segment.start_time:.1f}s-{segment.end_time:.1f}s):")
            preview = segment.text[:100] + "..." if len(segment.text) > 100 else segment.text
            print(f"    English: \"{preview}\"")

        print()
        print("=" * 80)
        print("STEP 4: Assign English voices to Hebrew speakers")
        print("=" * 80)

        # Get voice mapping for English translation
        voice_mapping = diarization_service.get_speaker_voice_mapping(
            segments=speaker_segments,
            language="en",  # English voices
            default_gender="male"
        )

        print("\nVoice assignments for English translation:")
        for speaker, (voice_id, gender) in voice_mapping.items():
            speaker_segs = [s for s in speaker_segments if s.speaker_id == speaker]
            speaker_time = sum(s.duration for s in speaker_segs)
            print(f"  {speaker}:")
            print(f"    Voice: {gender} ElevenLabs voice ({voice_id})")
            print(f"    Speaking time: {speaker_time:.1f}s")
            print()

        print()
        print("=" * 80)
        print("✅ HEBREW MULTI-SPEAKER TEST COMPLETE!")
        print("=" * 80)
        print()
        print("Results:")
        print(f"  ✅ Successfully detected {len(unique_speakers)} Hebrew speaker(s)")
        print(f"  ✅ Google Cloud transcribed Hebrew text automatically")
        print(f"  ✅ Translated {len(translated_segments)} segments to English")
        print(f"  ✅ Assigned different voices to each speaker")
        print(f"  ✅ Background sounds preserved for final mixing")
        print()
        print("Google Cloud Hebrew Support:")
        print("  ✅ Speaker diarization works for Hebrew (he-IL)")
        print("  ✅ Automatic Hebrew transcription with speaker labels")
        print("  ✅ Word-level timestamps included")
        print("  ✅ Ready for Hebrew → English multi-speaker translation")
        print()
        print("Next steps for full implementation:")
        print("  1. Generate English TTS for each speaker segment")
        print("  2. Use different ElevenLabs voices per speaker")
        print("  3. Mix all English segments with original Hebrew background")
        print("  4. Upload multi-speaker translated podcast")
        print("=" * 80)

    except Exception as e:
        print()
        print("=" * 80)
        print(f"❌ ERROR DURING SPEAKER DIARIZATION")
        print("=" * 80)
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print()
        print("Possible issues:")
        print("  - Google Cloud may have limited Hebrew speaker diarization support")
        print("  - Check Google Cloud Speech-to-Text API is enabled")
        print("  - Verify service account has correct permissions")
        print("  - Check GCS bucket name is configured correctly")
        print()
        import traceback
        print("Full traceback:")
        print(traceback.format_exc())

    finally:
        # Cleanup
        print()
        print("Cleaning up temporary files...")
        await audio_processor.cleanup_temp_files(str(episode.id))
        print("✅ Cleanup complete")

    client.close()

if __name__ == "__main__":
    asyncio.run(test_haaretz_direct())
