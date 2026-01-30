"""
AI Agent Executors - Podcast Management

Tool execution functions for managing podcasts and episodes.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.models.content import Podcast, PodcastEpisode
from app.services.podcast_sync import sync_podcast_episodes

logger = logging.getLogger(__name__)


async def execute_manage_podcast_episodes(
    audit_id: str, podcast_id: Optional[str] = None, max_episodes_to_keep: int = 3
) -> Dict[str, Any]:
    """
    Manage podcast episodes: sync latest from RSS and keep only the N most recent episodes.

    Args:
        audit_id: Current audit ID for tracking
        podcast_id: Optional specific podcast to manage, otherwise manages all
        max_episodes_to_keep: Maximum episodes to keep per podcast (default 3)

    Returns:
        Dictionary with management results
    """
    try:
        results = {
            "success": True,
            "podcasts_processed": 0,
            "episodes_synced": 0,
            "episodes_deleted": 0,
            "podcasts": [],
        }

        # Get podcasts to process
        if podcast_id:
            podcast = await Podcast.get(podcast_id)
            if not podcast:
                return {"success": False, "error": f"Podcast not found: {podcast_id}"}
            podcasts = [podcast]
        else:
            # Get all active podcasts with RSS feeds
            podcasts = await Podcast.find(
                {"is_active": True, "rss_feed": {"$exists": True, "$ne": None}}
            ).to_list(length=None)

        if not podcasts:
            return {
                "success": True,
                "message": "No active podcasts with RSS feeds found",
                "podcasts_processed": 0,
            }

        logger.info(f"🎙️ Managing {len(podcasts)} podcast(s)")

        # Process each podcast
        for podcast in podcasts:
            podcast_result = {
                "podcast_id": str(podcast.id),
                "title": podcast.title,
                "episodes_synced": 0,
                "episodes_deleted": 0,
                "current_episode_count": 0,
                "latest_episode_date": None,
            }

            try:
                # Step 1: Sync latest episodes from RSS feed
                logger.info(f"📡 Syncing episodes for: {podcast.title}")
                episodes_synced = await sync_podcast_episodes(podcast, max_episodes=10)
                podcast_result["episodes_synced"] = episodes_synced
                results["episodes_synced"] += episodes_synced

                if episodes_synced > 0:
                    logger.info(
                        f"✅ Synced {episodes_synced} new episode(s) for {podcast.title}"
                    )

                # Step 2: Get all episodes for this podcast, sorted by published date (newest first)
                all_episodes = (
                    await PodcastEpisode.find({"podcast_id": str(podcast.id)})
                    .sort([("published_at", -1)])
                    .to_list(length=None)
                )

                total_episodes = len(all_episodes)
                podcast_result["current_episode_count"] = total_episodes

                if all_episodes:
                    podcast_result["latest_episode_date"] = all_episodes[
                        0
                    ].published_at.isoformat()

                # Step 3: Delete old episodes if we have more than max_episodes_to_keep
                if total_episodes > max_episodes_to_keep:
                    episodes_to_delete = all_episodes[max_episodes_to_keep:]
                    deleted_count = 0

                    logger.info(
                        f"🗑️ Deleting {len(episodes_to_delete)} old episode(s) from {podcast.title} "
                        f"(keeping {max_episodes_to_keep} most recent)"
                    )

                    for episode in episodes_to_delete:
                        try:
                            await episode.delete()
                            deleted_count += 1
                            logger.debug(
                                f"   Deleted: {episode.title} ({episode.published_at.date()})"
                            )
                        except Exception as e:
                            logger.warning(
                                f"Failed to delete episode {episode.title}: {str(e)}"
                            )

                    podcast_result["episodes_deleted"] = deleted_count
                    results["episodes_deleted"] += deleted_count

                    logger.info(f"✅ Deleted {deleted_count} old episode(s)")

                # Step 4: Update podcast metadata
                podcast.episode_count = min(total_episodes, max_episodes_to_keep)
                if all_episodes:
                    podcast.latest_episode_date = all_episodes[0].published_at
                podcast.updated_at = datetime.now(timezone.utc)
                await podcast.save()

                results["podcasts_processed"] += 1
                results["podcasts"].append(podcast_result)

                logger.info(
                    f"✅ {podcast.title}: {podcast_result['current_episode_count']} episode(s) "
                    f"(synced: {episodes_synced}, deleted: {podcast_result['episodes_deleted']})"
                )

            except Exception as e:
                logger.error(f"❌ Error managing {podcast.title}: {str(e)}")
                podcast_result["error"] = str(e)
                results["podcasts"].append(podcast_result)

        # Generate summary message
        summary = (
            f"Podcast Management Complete:\n"
            f"• Podcasts processed: {results['podcasts_processed']}\n"
            f"• New episodes synced: {results['episodes_synced']}\n"
            f"• Old episodes deleted: {results['episodes_deleted']}\n"
            f"• Max episodes per podcast: {max_episodes_to_keep}"
        )

        results["message"] = summary
        logger.info(f"\n✅ {summary}")

        return results

    except Exception as e:
        logger.error(f"❌ Failed to manage podcast episodes: {str(e)}")
        return {"success": False, "error": str(e)}
