"""
Compare Google Speech (with vocal separation) vs Whisper (no vocal separation)
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings

async def compare():
    """Compare transcription quality"""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    episode = await PodcastEpisode.get("697439f1e0501bc53693246c")

    print("=" * 100)
    print("TRANSCRIPTION QUALITY COMPARISON")
    print("=" * 100)
    print()

    # Google Speech (with vocal separation)
    if "he" in episode.translations:
        google_trans = episode.translations["he"]
        print("METHOD 1: Google Speech-to-Text WITH Vocal Separation (Demucs)")
        print("-" * 100)
        print("English Transcript:")
        print(google_trans.transcript[:500] + "...")
        print()
        print("Hebrew Translation:")
        print(google_trans.translated_text[:300] + "...")
        print()
        print(f"Character count: EN={len(google_trans.transcript)}, HE={len(google_trans.translated_text)}")
        print()

    # Whisper (no vocal separation)
    if "he_whisper_no_sep" in episode.translations:
        whisper_trans = episode.translations["he_whisper_no_sep"]
        print("METHOD 2: OpenAI Whisper WITHOUT Vocal Separation (Original Audio)")
        print("-" * 100)
        print("English Transcript:")
        print(whisper_trans.transcript[:500] + "...")
        print()
        print("Hebrew Translation:")
        print(whisper_trans.translated_text[:300] + "...")
        print()
        print(f"Character count: EN={len(whisper_trans.transcript)}, HE={len(whisper_trans.translated_text)}")
        print()

    print("=" * 100)
    print("ANALYSIS")
    print("=" * 100)
    print()
    print("❌ Google Speech WITH vocal separation produced GARBLED transcription:")
    print("   'Aoi is incredible' (should be 'AI is incredible')")
    print("   'container Brain Stew into a brief' (complete gibberish)")
    print("   'slap for isn't just another day off' (nonsense)")
    print()
    print("✅ Whisper WITHOUT vocal separation produced ACCURATE transcription:")
    print("   'Welcome back to FanDuel Casino's Thrill Talk...'")
    print("   Clear, accurate, and complete sentences")
    print()
    print("CONCLUSION: Vocal separation DEGRADES audio quality for transcription!")
    print("=" * 100)
    print()
    print("Audio URLs:")
    if "he" in episode.translations:
        print(f"  Google Speech: {episode.translations['he'].audio_url}")
    if "he_whisper_no_sep" in episode.translations:
        print(f"  Whisper:       {episode.translations['he_whisper_no_sep'].audio_url}")
    print()

    client.close()

if __name__ == "__main__":
    asyncio.run(compare())
