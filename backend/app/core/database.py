from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from typing import List, Type
from beanie import Document
from app.core.config import settings

# Models
from app.models.user import User
from app.models.verification import VerificationToken
from app.models.content import Content, LiveChannel, EPGEntry, RadioStation, Podcast, PodcastEpisode
from app.models.content_taxonomy import ContentSection, SectionSubcategory, Genre, Audience
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
from app.models.subtitle_preferences import SubtitlePreference
from app.models.admin import (
    Campaign, Transaction, Refund, AuditLog,
    EmailCampaign, PushNotification, SystemSettings, SubscriptionPlan,
)
from app.models.security_audit import SecurityAuditLog
from app.models.widget import Widget
from app.models.user_system_widget import UserSystemWidget
from app.models.librarian import AuditReport, LibrarianAction, StreamValidationCache, ClassificationVerificationCache
from app.models.recording import RecordingSession, Recording, RecordingSchedule, RecordingSubtitleCue
from app.models.upload import UploadJob, MonitoredFolder, UploadStats, BrowserUploadSession, UploadHashLock
from app.api.routes.favorites import Favorite
from app.api.routes.downloads import Download
from app.models.chess import ChessGame, ChessChatMessage
from app.models.friendship import FriendRequest, UserFriendship, GameResult, PlayerStats
from app.models.chat_translation import ChatTranslationCacheDoc
from app.models.direct_message import DirectMessage
from app.models.jewish_news import JewishNewsSource, JewishNewsItem
from app.models.jewish_calendar import JewishCalendarCache
from app.models.jewish_community import JewishOrganization, CommunityEvent, ScrapingJob
from app.models.jerusalem_content import JerusalemContentSource, JerusalemContentItem
from app.models.tel_aviv_content import TelAvivContentSource, TelAvivContentItem
from app.models.support import SupportTicket, SupportConversation, SupportAnalytics, FAQEntry
from app.models.documentation import (
    DocumentationArticle,
    DocumentationCategory,
    DocumentationFeedback,
    DocumentationSearchLog,
)
from app.models.culture import Culture, CultureCity, CultureNewsSource, CultureContentItem
from app.models.kids_content import KidsContentSource
from app.models.youngsters_content import YoungstersContentSource
from app.models.family_controls import FamilyControls
from app.services.mcp_content_discovery import ContentDiscoveryQueue
# Olorin.ai Platform models
from app.models.integration_partner import (
    IntegrationPartner,
    UsageRecord,
    DubbingSession,
    WebhookDelivery,
)
from app.models.content_embedding import ContentEmbedding, RecapSession
from app.models.cultural_reference import CulturalReference


class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def connect_to_mongo():
    """Create database connection with connection pool configuration."""
    db.client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        maxPoolSize=100,          # Maximum connections in pool (higher for main app)
        minPoolSize=20,           # Minimum connections to maintain
        maxIdleTimeMS=30000,      # Close idle connections after 30s
        waitQueueTimeoutMS=5000,  # Fail fast if pool exhausted
        connectTimeoutMS=10000,   # Connection timeout
        serverSelectionTimeoutMS=10000,  # Server selection timeout
    )

    # Build document models list
    document_models: List[Type[Document]] = [
        User,
        VerificationToken,
        Content,
        LiveChannel,
        EPGEntry,
        RadioStation,
        Podcast,
        PodcastEpisode,
        # Content taxonomy models (new classification system)
        ContentSection,
        SectionSubcategory,
        Genre,
        Audience,
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
        SubtitlePreference,
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
        # Upload models
        UploadJob,
        MonitoredFolder,
        UploadStats,
        BrowserUploadSession,
        UploadHashLock,
        # Chess models
        ChessGame,
        ChessChatMessage,
        # Friends & Stats models
        FriendRequest,
        UserFriendship,
        GameResult,
        PlayerStats,
        # Chat Translation models
        ChatTranslationCacheDoc,
        DirectMessage,
        # Judaism Section models
        JewishNewsSource,
        JewishNewsItem,
        JewishCalendarCache,
        JewishOrganization,
        CommunityEvent,
        ScrapingJob,
        # Jerusalem Content models
        JerusalemContentSource,
        JerusalemContentItem,
        # Tel Aviv Content models
        TelAvivContentSource,
        TelAvivContentItem,
        # Support system models
        SupportTicket,
        SupportConversation,
        SupportAnalytics,
        FAQEntry,
        # Documentation models
        DocumentationArticle,
        DocumentationCategory,
        DocumentationFeedback,
        DocumentationSearchLog,
        # Culture models (Global Cultures feature)
        Culture,
        CultureCity,
        CultureNewsSource,
        CultureContentItem,
        # Kids Content models
        KidsContentSource,
        # Youngsters Content models
        YoungstersContentSource,
        # Family Controls models (unified parental controls)
        FamilyControls,
        # MCP Content Discovery models
        ContentDiscoveryQueue,
    ]

    # Conditionally add Olorin models based on database separation setting
    # When Phase 2 (separate database) is enabled, Olorin models are managed separately
    if not settings.olorin.database.use_separate_database:
        # Phase 1: Olorin models in main database
        document_models.extend([
            IntegrationPartner,
            UsageRecord,
            DubbingSession,
            WebhookDelivery,
            ContentEmbedding,
            RecapSession,
            CulturalReference,
        ])
        print("Olorin models included in main database (Phase 1)")
    else:
        # Phase 2: Olorin models in separate database
        print("Olorin models excluded from main database (Phase 2 - separate database)")

    # Initialize Beanie with document models
    await init_beanie(
        database=db.client[settings.MONGODB_DB_NAME],
        document_models=document_models,
    )
    print(f"Connected to MongoDB: {settings.MONGODB_DB_NAME}")


async def close_mongo_connection():
    """Close database connection."""
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")


def get_database():
    return db.client[settings.MONGODB_DB_NAME]
