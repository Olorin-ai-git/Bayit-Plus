"""
Test multi-speaker podcast translation using Google Cloud Speech-to-Text.
No HuggingFace required - uses existing Google Cloud infrastructure.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings
from app.services.speaker_diarization_google import GoogleSpeakerDiarizationService

async def test_google_speaker_diarization():
    """Test speaker diarization using Google Cloud."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get Tucker Carlson episode (likely has host + guest = 2 speakers)
    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 80)
    print("GOOGLE CLOUD MULTI-SPEAKER DETECTION TEST")
    print("=" * 80)
    print(f"Episode: {episode.title}")
    print(f"Podcast: Tucker Carlson Show")
    print()
    print("Using: Google Cloud Speech-to-Text (built-in speaker diarization)")
    print("No HuggingFace or external dependencies required!")
    print()
    print("STEP 1: Download and separate vocals from background")
    print("=" * 80)

    from app.services.podcast_translation_service import PodcastTranslationService
    from app.services.audio_processing_service import AudioProcessingService
    from pathlib import Path

    translation_service = PodcastTranslationService()

    # Download audio (first 3 minutes for testing)
    print("Downloading audio...")
    original_path = await translation_service._download_audio(episode.audio_url)

    # Trim to 3 minutes
    print("Trimming to 3 minutes...")
    trimmed_path = str(Path(original_path).parent / f"trimmed_{Path(original_path).name}")
    await translation_service._trim_audio(original_path, trimmed_path, 180)

    # Separate vocals from background
    print("\nSeparating vocals from background using Demucs v4...")
    audio_processor = AudioProcessingService(temp_dir=settings.TEMP_AUDIO_DIR)
    output_dir = str(Path(settings.TEMP_AUDIO_DIR) / str(episode.id) / "separated")
    vocals_path, background_path = await audio_processor.separate_vocals(
        audio_path=trimmed_path,
        output_dir=output_dir
    )
    print(f"✅ Vocals: {vocals_path}")
    print(f"✅ Background: {background_path}")

    print()
    print("STEP 2: Detect speakers using Google Cloud Speech-to-Text")
    print("=" * 80)

    # Initialize Google speaker diarization service
    diarization_service = GoogleSpeakerDiarizationService()

    # Detect speakers in vocals (Google Cloud handles transcription + diarization together)
    print("\nRunning Google Cloud speaker diarization on vocals...")
    speaker_segments = await diarization_service.diarize_audio(
        audio_path=vocals_path,
        language="en-US",  # Tucker Carlson is English
        min_speakers=1,
        max_speakers=5
    )

    print(f"\n✅ Detected {len(set(seg.speaker_id for seg in speaker_segments))} speaker(s)")
    print("\nFirst 10 speaker segments:")
    for i, segment in enumerate(speaker_segments[:10]):
        print(f"  {i+1}. {segment}")
        if segment.text:
            preview = segment.text[:80] + "..." if len(segment.text) > 80 else segment.text
            print(f"      Text: \"{preview}\"")
    if len(speaker_segments) > 10:
        print(f"  ... and {len(speaker_segments) - 10} more segments")

    print()
    print("STEP 3: Assign different voices to each speaker")
    print("=" * 80)

    # Get voice mapping for speakers
    voice_mapping = diarization_service.get_speaker_voice_mapping(
        segments=speaker_segments,
        language="he",  # Hebrew translation
        default_gender="male"  # Tucker Carlson is male
    )

    print("\nVoice assignments for Hebrew translation:")
    for speaker, (voice_id, gender) in voice_mapping.items():
        speaker_segs = [s for s in speaker_segments if s.speaker_id == speaker]
        speaker_time = sum(s.duration for s in speaker_segs)
        speaker_words = sum(len(s.text.split()) for s in speaker_segs if s.text)
        print(f"  {speaker}:")
        print(f"    Voice: {gender} ({voice_id})")
        print(f"    Speaking time: {speaker_time:.1f}s")
        print(f"    Words spoken: ~{speaker_words}")
        print()

    print()
    print("STEP 4: Translate each speaker's text to Hebrew")
    print("=" * 80)

    # Translate segments
    print("\nTranslating speaker segments to Hebrew...")
    translated_segments = await diarization_service.translate_segments_by_speaker(
        segments=speaker_segments,
        source_lang="en",
        target_lang="he"
    )

    print(f"✅ Translated {len(translated_segments)} segments")
    print("\nFirst 3 translated segments:")
    for i, segment in enumerate(translated_segments[:3]):
        print(f"\n  {segment.speaker_id} ({segment.start_time:.1f}s-{segment.end_time:.1f}s):")
        print(f"    Hebrew: \"{segment.text[:100]}...\"" if len(segment.text) > 100 else f"    Hebrew: \"{segment.text}\"")

    print()
    print("=" * 80)
    print("✅ GOOGLE CLOUD MULTI-SPEAKER ANALYSIS COMPLETE!")
    print("=" * 80)
    print()
    print("Summary:")
    print(f"  - Detected {len(voice_mapping)} speaker(s) using Google Cloud")
    print(f"  - Separated vocals from background music/sounds")
    print(f"  - Translated {len(translated_segments)} speaker segments to Hebrew")
    print(f"  - Each speaker assigned different voice for translation")
    print(f"  - Background sounds will be preserved in final audio")
    print()
    print("Advantages of Google Cloud approach:")
    print("  ✅ No HuggingFace dependency")
    print("  ✅ Uses existing Google Cloud infrastructure")
    print("  ✅ Same credentials as other Google services")
    print("  ✅ Transcription + diarization in one API call")
    print("  ✅ Automatic word-level timestamps")
    print()
    print("Next steps:")
    print("  1. Generate TTS for each speaker with their assigned voice")
    print("  2. Mix all speaker segments with original background")
    print("  3. Upload final multi-speaker translated audio")
    print("=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(test_google_speaker_diarization())
