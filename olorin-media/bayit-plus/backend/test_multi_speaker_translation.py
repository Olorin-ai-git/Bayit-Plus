"""
Test multi-speaker podcast translation with background sound preservation.
Detects different speakers and assigns different voices to each.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings
from app.services.speaker_diarization_service import SpeakerDiarizationService

async def test_multi_speaker():
    """Test speaker diarization and multi-voice translation."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    # Get Tucker Carlson episode (likely has host + guest = 2 speakers)
    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 80)
    print("MULTI-SPEAKER TRANSLATION TEST")
    print("=" * 80)
    print(f"Episode: {episode.title}")
    print(f"Podcast: Tucker Carlson Show")
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
    print("STEP 2: Detect speakers using pyannote.audio diarization")
    print("=" * 80)

    # Initialize speaker diarization service
    diarization_service = SpeakerDiarizationService()
    await diarization_service.initialize()

    # Detect speakers in vocals
    print("\nRunning speaker diarization on vocals...")
    speaker_segments = await diarization_service.diarize_audio(
        audio_path=vocals_path,
        min_speakers=1,
        max_speakers=5
    )

    print(f"\n✅ Detected {len(set(seg.speaker_id for seg in speaker_segments))} speaker(s)")
    print("\nSpeaker segments:")
    for i, segment in enumerate(speaker_segments[:10]):  # Show first 10
        print(f"  {i+1}. {segment}")
    if len(speaker_segments) > 10:
        print(f"  ... and {len(speaker_segments) - 10} more segments")

    print()
    print("STEP 3: Align transcript with speakers")
    print("=" * 80)

    # Transcribe vocals to get text and word timestamps
    print("\nTranscribing vocals with Whisper...")
    from app.services.whisper_transcription_service import WhisperTranscriptionService
    whisper = WhisperTranscriptionService()
    transcript, detected_lang = await whisper.transcribe_audio_file(vocals_path)
    print(f"✅ Transcribed {len(transcript)} characters")
    print(f"   Detected language: {detected_lang}")

    # Align transcript with speaker segments
    print("\nAligning transcript with speaker segments...")
    aligned_segments = await diarization_service.align_transcript_with_speakers(
        segments=speaker_segments,
        transcript=transcript,
        audio_path=vocals_path
    )

    print(f"✅ Aligned transcript with speakers")
    print("\nFirst 5 aligned segments:")
    for i, segment in enumerate([s for s in aligned_segments if s.text][:5]):
        print(f"  {segment.speaker_id} ({segment.start_time:.1f}s-{segment.end_time:.1f}s):")
        print(f"    \"{segment.text[:100]}...\"" if len(segment.text) > 100 else f"    \"{segment.text}\"")
        print()

    print()
    print("STEP 4: Assign different voices to each speaker")
    print("=" * 80)

    # Get voice mapping for speakers
    voice_mapping = diarization_service.get_speaker_voice_mapping(
        segments=aligned_segments,
        language="he",  # Hebrew translation
        default_gender="male"  # Tucker Carlson is male
    )

    print("\nVoice assignments:")
    for speaker, (voice_id, gender) in voice_mapping.items():
        speaker_time = sum(s.duration for s in aligned_segments if s.speaker_id == speaker)
        print(f"  {speaker}: {gender} voice ({voice_id}) - {speaker_time:.1f}s total speaking time")

    print()
    print("=" * 80)
    print("✅ MULTI-SPEAKER ANALYSIS COMPLETE!")
    print("=" * 80)
    print()
    print("Summary:")
    print(f"  - Detected {len(voice_mapping)} speaker(s)")
    print(f"  - Separated vocals from background music/sounds")
    print(f"  - Each speaker will get a different voice in translation")
    print(f"  - Background sounds will be preserved in final audio")
    print()
    print("Next steps:")
    print("  1. Translate each speaker's text to target language")
    print("  2. Generate TTS for each speaker with their assigned voice")
    print("  3. Mix all speaker segments with original background")
    print("  4. Upload final multi-speaker translated audio")
    print("=" * 80)

    client.close()

if __name__ == "__main__":
    asyncio.run(test_multi_speaker())
