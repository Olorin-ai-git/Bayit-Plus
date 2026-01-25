"""
Monitor Haaretz episode translation progress in real-time.
Checks every 60 seconds and reports stage completion.
"""
import asyncio
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import PodcastEpisode
from app.core.config import settings


async def monitor_translation(episode_id: str, check_interval: int = 60):
    """Monitor translation progress and report stage completions."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[PodcastEpisode])

    previous_stages = set()
    iteration = 0

    try:
        while True:
            iteration += 1
            timestamp = datetime.now().strftime("%H:%M:%S")

            episode = await PodcastEpisode.get(episode_id)
            if not episode:
                print(f"[{timestamp}] ❌ Episode not found")
                break

            current_stages = set(episode.translation_stages.keys()) if episode.translation_stages else set()
            new_stages = current_stages - previous_stages

            # Report new completed stages
            if new_stages:
                for stage in new_stages:
                    stage_data = episode.translation_stages[stage]
                    stage_time = stage_data.get('timestamp', 'unknown')
                    print(f"[{timestamp}] ✅ NEW STAGE COMPLETED: {stage}")
                    print(f"              Timestamp: {stage_time}")

                    # Show stage-specific details
                    if stage == 'transcribed':
                        print(f"              Detected language: {stage_data.get('detected_lang', 'N/A')}")
                        transcript = stage_data.get('transcript', '')
                        print(f"              Transcript length: {len(transcript)} chars")
                    elif stage == 'uploaded':
                        print(f"              Audio URL: {stage_data.get('url', 'N/A')}")

            # Status summary
            status_symbol = {
                'pending': '⏸️',
                'processing': '🔄',
                'completed': '✅',
                'failed': '❌'
            }.get(episode.translation_status, '❓')

            print(f"[{timestamp}] {status_symbol} Status: {episode.translation_status}")
            print(f"              Completed stages ({len(current_stages)}): {sorted(current_stages)}")
            print(f"              Retry count: {episode.retry_count}")
            print()

            # Check if translation completed or failed
            if episode.translation_status == 'completed':
                print("=" * 60)
                print("🎉 TRANSLATION COMPLETED SUCCESSFULLY!")
                print("=" * 60)
                print(f"Available languages: {episode.available_languages}")
                break
            elif episode.translation_status == 'failed':
                print("=" * 60)
                print("❌ TRANSLATION FAILED")
                print("=" * 60)
                if episode.translation_error:
                    print(f"Error: {episode.translation_error}")
                break

            previous_stages = current_stages

            # Wait before next check
            if iteration > 1:  # Skip wait on first iteration
                await asyncio.sleep(check_interval)

    finally:
        client.close()


if __name__ == "__main__":
    episode_id = "69729fac9d27d77a468d90b0"

    if len(sys.argv) > 1:
        episode_id = sys.argv[1]

    if len(sys.argv) > 2:
        check_interval = int(sys.argv[2])
    else:
        check_interval = 60

    print("=" * 60)
    print("HAARETZ EPISODE TRANSLATION MONITOR")
    print("=" * 60)
    print(f"Episode ID: {episode_id}")
    print(f"Check interval: {check_interval} seconds")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    asyncio.run(monitor_translation(episode_id, check_interval))
