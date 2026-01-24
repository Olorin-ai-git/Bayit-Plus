#!/usr/bin/env python3
"""
Run translation for Tucker Carlson latest episode.
Forces translation even if status is 'processing'.
"""
import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import Podcast, PodcastEpisode
from app.services.podcast_translation_service import PodcastTranslationService


async def run_translation():
    """Run translation with force flag."""

    print("\n" + "="*80)
    print("🎙️  Tucker Carlson Episode Translation")
    print("="*80 + "\n")

    await connect_to_mongo()

    # Get podcast
    podcast = await Podcast.find_one(Podcast.title == "The Tucker Carlson Show")
    if not podcast:
        print("❌ Podcast not found")
        await close_mongo_connection()
        return

    print(f"✅ Found podcast: {podcast.title}\n")

    # Get latest episode
    latest_episode = await PodcastEpisode.find({
        "podcast_id": str(podcast.id)
    }).sort("-published_at").first_or_none()

    if not latest_episode:
        print("❌ No episodes found")
        await close_mongo_connection()
        return

    print(f"📝 Latest Episode:")
    print(f"   Title: {latest_episode.title}")
    print(f"   Status: {latest_episode.translation_status}")
    print(f"   Original Language: {latest_episode.original_language}")

    # Reset status if stuck in processing
    if latest_episode.translation_status == "processing":
        print(f"\n⚠️  Episode is in 'processing' state. Resetting...")
        await PodcastEpisode.find_one({"_id": latest_episode.id}).update({
            "$set": {
                "translation_status": "pending",
                "updated_at": datetime.utcnow()
            }
        })
        # Refresh episode
        latest_episode = await PodcastEpisode.get(latest_episode.id)
        print(f"   ✅ Reset to 'pending'")

    print(f"\n🔄 Starting translation pipeline...")
    print(f"\n   Pipeline Steps:")
    print(f"   1️⃣  Download audio from {latest_episode.audio_url[:60]}...")
    print(f"   2️⃣  Separate vocals from background music")
    print(f"   3️⃣  Transcribe vocals using Whisper STT")
    print(f"   4️⃣  Translate English → Hebrew")
    print(f"   5️⃣  Generate Hebrew TTS with ElevenLabs")
    print(f"   6️⃣  Mix Hebrew vocals with original background")
    print(f"   7️⃣  Upload to Google Cloud Storage")
    print(f"\n   ⏱️  Estimated time: 10-30 minutes\n")

    try:
        translation_service = PodcastTranslationService()
        result = await translation_service.translate_episode(latest_episode, force=True)

        print(f"\n✅ Translation completed successfully!\n")
        print(f"📊 Results:")
        for lang, url in result.items():
            print(f"   {lang.upper()}: {url}")

        # Get updated episode
        updated_episode = await PodcastEpisode.get(latest_episode.id)
        print(f"\n📝 Episode Status:")
        print(f"   Translation Status: {updated_episode.translation_status}")
        print(f"   Available Languages: {updated_episode.available_languages}")

        if hasattr(updated_episode, "translations") and updated_episode.translations:
            print(f"\n🎯 Translation Details:")
            for lang_code, trans_data in updated_episode.translations.items():
                print(f"\n   {lang_code.upper()}:")
                print(f"      Audio URL: {trans_data.get('audio_url', 'N/A')}")
                print(f"      Duration: {trans_data.get('duration', 'N/A')}")
                print(f"      Voice ID: {trans_data.get('voice_id', 'N/A')}")
                print(f"      File Size: {trans_data.get('file_size', 0)} bytes")

    except Exception as e:
        print(f"\n❌ Translation failed: {e}")
        import traceback
        traceback.print_exc()

    await close_mongo_connection()
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(run_translation())
