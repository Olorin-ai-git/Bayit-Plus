from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

# Models
from app.models.user import User
from app.models.verification import VerificationToken
from app.models.content import Content, Category, LiveChannel, EPGEntry, RadioStation, Podcast, PodcastEpisode
from app.models.subscription import Subscription, Invoice
from app.models.watchlist import WatchlistItem, WatchHistory, Conversation
from app.models.profile import Profile
from app.models.flow import Flow
from app.models.realtime import WatchParty, ChatMessage
from app.models.trending import TrendingSnapshot, ContentTrendMatch
from app.models.chapters import VideoChapters
from app.models.subtitles import (
    SubtitleTrackDoc,
    TranslationCacheDoc,
    SubtitleSearchCacheDoc,
    SubtitleQuotaTrackerDoc,
)
from app.models.admin import (
    Campaign, Transaction, Refund, AuditLog,
    EmailCampaign, PushNotification, SystemSettings, SubscriptionPlan,
)
from app.models.security_audit import SecurityAuditLog
from app.models.widget import Widget
from app.models.user_system_widget import UserSystemWidget
from app.models.librarian import AuditReport, LibrarianAction, StreamValidationCache, ClassificationVerificationCache
from app.models.recording import RecordingSession, Recording, RecordingSchedule, RecordingSubtitleCue
from app.api.routes.favorites import Favorite
from app.api.routes.downloads import Download


class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def connect_to_mongo():
    """Create database connection."""
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)

    # Initialize Beanie with document models
    await init_beanie(
        database=db.client[settings.MONGODB_DB_NAME],
        document_models=[
            User,
            VerificationToken,
            Content,
            Category,
            LiveChannel,
            EPGEntry,
            RadioStation,
            Podcast,
            PodcastEpisode,
            Subscription,
            Invoice,
            WatchlistItem,
            WatchHistory,
            Conversation,
            Profile,
            Flow,
            # Real-time models
            WatchParty,
            ChatMessage,
            # Trending models
            TrendingSnapshot,
            ContentTrendMatch,
            # Chapter models
            VideoChapters,
            # Subtitle models
            SubtitleTrackDoc,
            TranslationCacheDoc,
            SubtitleSearchCacheDoc,
            SubtitleQuotaTrackerDoc,
            # Admin models
            Campaign,
            Transaction,
            Refund,
            AuditLog,
            EmailCampaign,
            PushNotification,
            SystemSettings,
            SubscriptionPlan,
            # Security audit log
            SecurityAuditLog,
            # Widget models
            Widget,
            UserSystemWidget,
            # Librarian AI Agent models
            AuditReport,
            LibrarianAction,
            StreamValidationCache,
            ClassificationVerificationCache,
            # User content models
            Favorite,
            Download,
            # Recording models
            RecordingSession,
            Recording,
            RecordingSchedule,
            RecordingSubtitleCue,
        ],
    )
    print(f"Connected to MongoDB: {settings.MONGODB_DB_NAME}")


async def close_mongo_connection():
    """Close database connection."""
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")


def get_database():
    return db.client[settings.MONGODB_DB_NAME]
