"""
Create MongoDB indexes for all collections
Run this script after initializing the database to create necessary indexes for performance
"""

import asyncio
from app.core.database import connect_to_mongo, close_mongo_connection
from app.models.content import Content, LiveChannel, RadioStation, Podcast, PodcastEpisode, Category
from app.models.content_taxonomy import ContentSection
from app.models.user import User
from app.models.subscription import Subscription
from app.models.watchlist import WatchlistItem, WatchHistory
from app.models.admin import AuditLog
from app.models.realtime import WatchParty, ChatMessage
from app.models.chapters import VideoChapters
from app.models.subtitles import SubtitleTrackDoc
from app.models.trivia import ContentTrivia
from app.models.live_feature_quota import LiveFeatureQuota, LiveFeatureUsageSession


async def create_indexes():
    """Create all indexes"""
    print("Connecting to MongoDB...")
    await connect_to_mongo()

    try:
        print("Creating indexes...")

        # Content indexes
        print("  - Content indexes")
        await Content.get_pymongo_collection().create_index("category_id")
        await Content.get_pymongo_collection().create_index("is_featured")
        await Content.get_pymongo_collection().create_index("is_published")
        await Content.get_pymongo_collection().create_index("series_id")
        await Content.get_pymongo_collection().create_index("created_at")
        await Content.get_pymongo_collection().create_index("updated_at")
        await Content.get_pymongo_collection().create_index([("category_id", 1), ("is_published", 1)])
        await Content.get_pymongo_collection().create_index([("is_featured", 1), ("is_published", 1)])

        # Category indexes
        print("  - Category indexes")
        await Category.get_pymongo_collection().create_index("slug")
        await Category.get_pymongo_collection().create_index("order")

        # Live Channel indexes
        print("  - Live Channel indexes")
        await LiveChannel.get_pymongo_collection().create_index("order")
        await LiveChannel.get_pymongo_collection().create_index("is_active")
        await LiveChannel.get_pymongo_collection().create_index("created_at")

        # Radio Station indexes
        print("  - Radio Station indexes")
        await RadioStation.get_pymongo_collection().create_index("order")
        await RadioStation.get_pymongo_collection().create_index("is_active")
        await RadioStation.get_pymongo_collection().create_index("genre")

        # Podcast indexes
        print("  - Podcast indexes")
        await Podcast.get_pymongo_collection().create_index("category")
        await Podcast.get_pymongo_collection().create_index("is_active")
        await Podcast.get_pymongo_collection().create_index("latest_episode_date")
        await Podcast.get_pymongo_collection().create_index("order")

        # Podcast Episode indexes
        print("  - Podcast Episode indexes")
        await PodcastEpisode.get_pymongo_collection().create_index("podcast_id")
        await PodcastEpisode.get_pymongo_collection().create_index([("podcast_id", 1), ("episode_number", 1)])
        await PodcastEpisode.get_pymongo_collection().create_index([("podcast_id", 1), ("season_number", 1), ("episode_number", 1)])
        await PodcastEpisode.get_pymongo_collection().create_index([("podcast_id", 1), ("published_at", -1)])

        # User indexes
        print("  - User indexes")
        await User.get_pymongo_collection().create_index("email")
        await User.get_pymongo_collection().create_index("stripe_customer_id")
        await User.get_pymongo_collection().create_index("role")
        await User.get_pymongo_collection().create_index("created_at")

        # Subscription indexes
        print("  - Subscription indexes")
        await Subscription.get_pymongo_collection().create_index("user_id")
        await Subscription.get_pymongo_collection().create_index("stripe_subscription_id")
        await Subscription.get_pymongo_collection().create_index("status")

        # Watchlist indexes
        print("  - Watchlist indexes")
        await WatchlistItem.get_pymongo_collection().create_index([("user_id", 1), ("content_id", 1)])
        await WatchlistItem.get_pymongo_collection().create_index("profile_id")

        # Watch History indexes
        print("  - Watch History indexes")
        await WatchHistory.get_pymongo_collection().create_index([("user_id", 1), ("last_watched_at", -1)])
        await WatchHistory.get_pymongo_collection().create_index("profile_id")
        await WatchHistory.get_pymongo_collection().create_index("content_id")

        # Audit Log indexes
        print("  - Audit Log indexes")
        await AuditLog.get_pymongo_collection().create_index("user_id")
        await AuditLog.get_pymongo_collection().create_index("action")
        await AuditLog.get_pymongo_collection().create_index("resource_type")
        await AuditLog.get_pymongo_collection().create_index([("created_at", -1)])

        # Watch Party indexes
        print("  - Watch Party indexes")
        await WatchParty.get_pymongo_collection().create_index("host_id")
        await WatchParty.get_pymongo_collection().create_index("room_code")

        # Chat Message indexes
        print("  - Chat Message indexes")
        await ChatMessage.get_pymongo_collection().create_index("party_id")
        await ChatMessage.get_pymongo_collection().create_index([("party_id", 1), ("created_at", -1)])

        # Video Chapters indexes
        print("  - Video Chapters indexes")
        await VideoChapters.get_pymongo_collection().create_index("content_id")

        # Subtitle indexes
        print("  - Subtitle indexes")
        await SubtitleTrackDoc.get_pymongo_collection().create_index("content_id")
        await SubtitleTrackDoc.get_pymongo_collection().create_index([("content_id", 1), ("language", 1)])

        # Trivia indexes
        print("  - Trivia indexes")
        await ContentTrivia.get_pymongo_collection().create_index("content_id")
        await ContentTrivia.get_pymongo_collection().create_index("tmdb_id")
        await ContentTrivia.get_pymongo_collection().create_index("is_enriched")
        await ContentTrivia.get_pymongo_collection().create_index(
            [("content_id", 1), ("content_type", 1)],
            unique=True,
            name="content_trivia_unique_content"
        )

        # Live Feature Quota indexes
        print("  - Live Feature Quota indexes")
        await LiveFeatureQuota.get_pymongo_collection().create_index(
            "user_id",
            unique=True,
            name="quota_user_unique"
        )
        await LiveFeatureQuota.get_pymongo_collection().create_index("last_hour_reset")
        await LiveFeatureQuota.get_pymongo_collection().create_index("last_day_reset")
        await LiveFeatureQuota.get_pymongo_collection().create_index("last_month_reset")

        # Live Feature Usage Session indexes
        print("  - Live Feature Usage Session indexes")
        await LiveFeatureUsageSession.get_pymongo_collection().create_index(
            "session_id",
            unique=True,
            name="session_id_unique"
        )
        await LiveFeatureUsageSession.get_pymongo_collection().create_index("user_id")
        await LiveFeatureUsageSession.get_pymongo_collection().create_index("status")
        await LiveFeatureUsageSession.get_pymongo_collection().create_index("feature_type")
        await LiveFeatureUsageSession.get_pymongo_collection().create_index([("user_id", 1), ("started_at", -1)])
        await LiveFeatureUsageSession.get_pymongo_collection().create_index([("feature_type", 1), ("started_at", -1)])
        await LiveFeatureUsageSession.get_pymongo_collection().create_index([("started_at", -1)])
        # TTL index for auto-cleanup of old completed sessions (90 days)
        await LiveFeatureUsageSession.get_pymongo_collection().create_index(
            "started_at",
            expireAfterSeconds=7776000,  # 90 days
            partialFilterExpression={"status": {"$in": ["completed", "error", "interrupted"]}},
            name="session_ttl"
        )

        print("\n✅ All indexes created successfully!")

    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
        raise

    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(create_indexes())
