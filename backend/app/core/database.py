import logging
from typing import List, Type

from beanie import Document, init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from olorin_shared.database import (close_mongodb_connection,
                                    get_mongodb_client, get_mongodb_database,
                                    init_mongodb)

logger = logging.getLogger(__name__)

from app.api.routes.downloads import Download
from app.api.routes.favorites import Favorite
from app.core.config import settings
from app.models.admin import (AuditLog, Campaign, EmailCampaign,
                              PushNotification, Refund, SubscriptionPlan,
                              SystemSettings, Transaction)
# Beta 500 program models
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.models.cost_breakdown import CostBreakdown, UserCostBreakdown
from app.models.chapters import VideoChapters
from app.models.channel_chat import (
    ChannelChatMessage,
    ChatTranslationCacheEntry,
    ChatReaction,
    ModerationAuditLog,
)
from app.models.chat_translation import ChatTranslationCacheDoc
from app.models.chess import ChessChatMessage, ChessGame
from app.models.content import (Content, EPGEntry, LiveChannel, Podcast,
                                PodcastEpisode, RadioStation,
                                TranslationStageMetrics)
from app.models.content_embedding import ContentEmbedding, RecapSession
from app.models.content_taxonomy import (Audience, ContentSection, Genre,
                                         SectionSubcategory)
from app.models.cultural_reference import CulturalReference
from app.models.culture import (Culture, CultureCity, CultureContentItem,
                                CultureNewsSource)
from app.models.direct_message import DirectMessage
from app.models.documentation import (DocumentationArticle,
                                      DocumentationCategory,
                                      DocumentationFeedback,
                                      DocumentationSearchLog)
from app.models.family_controls import FamilyControls
from app.models.friendship import (FriendRequest, GameResult, PlayerStats,
                                   UserFriendship)
# Olorin.ai Platform models
from app.models.integration_partner import (DubbingSession, IntegrationPartner,
                                            UsageRecord, WebhookDelivery)
from app.models.jerusalem_content import (JerusalemContentItem,
                                          JerusalemContentSource)
from app.models.jewish_calendar import JewishCalendarCache
from app.models.jewish_community import (CommunityEvent, JewishOrganization,
                                         ScrapingJob)
from app.models.jewish_news import JewishNewsItem, JewishNewsSource
from app.models.kids_content import KidsContentSource
from app.models.librarian import (AuditReport, ClassificationVerificationCache,
                                  LibrarianAction, StreamValidationCache)
from app.models.live_dubbing import LiveDubbingSession
from app.models.live_feature_quota import (LiveFeatureQuota,
                                           LiveFeatureUsageSession)
from app.models.location_cache import LocationCache
from app.models.profile import Profile
from app.models.realtime import ChatMessage, WatchParty
from app.models.recording import (Recording, RecordingSchedule,
                                  RecordingSession, RecordingSubtitleCue)
from app.models.series_recording_rule import SeriesRecordingRule
from app.models.search_analytics import SearchQuery
from app.models.security_audit import SecurityAuditLog
from app.models.subscription import Invoice, Subscription
from app.models.subtitle_preferences import SubtitlePreference
from app.models.subtitles import (SubtitleQuotaTrackerDoc,
                                  SubtitleSearchCacheDoc, SubtitleTrackDoc,
                                  TranslationCacheDoc)
from app.models.support import (FAQEntry, SupportAnalytics,
                                SupportConversation, SupportTicket)
from app.models.tel_aviv_content import (TelAvivContentItem,
                                         TelAvivContentSource)
from app.models.trending import ContentTrendMatch, TrendingSnapshot
from app.models.trivia import ContentTrivia
from app.models.upload import (BrowserUploadSession, MonitoredFolder,
                               UploadHashLock, UploadJob, UploadStats)
# Models
from app.models.user import User
from app.models.user_system_widget import UserSystemWidget
from app.models.playback_session import PlaybackSession
from app.models.notification_event import NotificationEvent, NotificationMetrics
from app.models.passkey_credential import PasskeyCredential, PasskeySession, PasskeyChallenge
from app.models.voice_config import VoiceConfiguration, VoiceProviderHealth
from app.models.verification import VerificationToken
from app.models.watchlist import Conversation, WatchHistory, WatchlistItem
from app.models.widget import Widget
from app.models.youngsters_content import YoungstersContentSource
from app.services.mcp_content_discovery import ContentDiscoveryQueue
# Migration tracking models
from app.models.migration import MigrationRecord, RollbackData
# NLP models
from app.models.nlp_session import NLPConversationSession
from app.models.user_audible_account import UserAudibleAccount
from app.models.diagnostics import ClientHeartbeat, ClientHealthHistory, ClientAlert


class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def ensure_ttl_indexes(database):
    """
    Create TTL (Time To Live) indexes for automatic document expiration.

    TTL indexes cannot be defined in Beanie model Settings because they require
    the `expireAfterSeconds` parameter. We create them manually during startup.
    """
    try:
        # Translation cache: Expire documents based on expires_at field
        # expireAfterSeconds=0 means expire exactly at the expires_at time
        chat_translation_cache = database["chat_translation_cache"]
        await chat_translation_cache.create_index(
            [("expires_at", 1)],
            expireAfterSeconds=0,
            name="ttl_expires_at"
        )
        logger.info("Created TTL index on chat_translation_cache.expires_at")
    except Exception as e:
        # Index may already exist, log warning but don't fail startup
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            logger.debug(f"TTL index already exists on chat_translation_cache: {e}")
        else:
            logger.warning(f"Failed to create TTL index on chat_translation_cache: {e}")


async def connect_to_mongo():
    """Create database connection using centralized olorin-shared MongoDB connection."""
    # Initialize centralized MongoDB connection from olorin-shared
    await init_mongodb()

    # Get client for backward compatibility with existing code
    db.client = get_mongodb_client()

    # Build document models list
    document_models: List[Type[Document]] = [
        User,
        PlaybackSession,
        NotificationEvent,
        NotificationMetrics,
        PasskeyCredential,
        PasskeySession,
        PasskeyChallenge,
        VoiceConfiguration,
        VoiceProviderHealth,
        VerificationToken,
        Content,
        LiveChannel,
        EPGEntry,
        RadioStation,
        Podcast,
        PodcastEpisode,
        TranslationStageMetrics,
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
        # Real-time models
        WatchParty,
        ChatMessage,
        # Trending models
        TrendingSnapshot,
        ContentTrendMatch,
        # Chapter models
        VideoChapters,
        # Trivia models
        ContentTrivia,
        # Subtitle models
        SubtitleTrackDoc,
        TranslationCacheDoc,
        SubtitleSearchCacheDoc,
        SubtitleQuotaTrackerDoc,
        SubtitlePreference,
        # Search analytics models
        SearchQuery,
        # Admin models
        Campaign,
        Transaction,
        Refund,
        AuditLog,
        EmailCampaign,
        PushNotification,
        SystemSettings,
        SubscriptionPlan,
        # Cost tracking models
        CostBreakdown,
        UserCostBreakdown,
        # Security audit log
        SecurityAuditLog,
        # Diagnostics models (system health monitoring)
        ClientHeartbeat,
        ClientHealthHistory,
        ClientAlert,
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
        SeriesRecordingRule,
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
        # Channel Chat models (live channel public chat)
        ChannelChatMessage,
        ChatTranslationCacheEntry,
        ChatReaction,
        ModerationAuditLog,
        # Beta 500 program models
        BetaCredit,
        BetaCreditTransaction,
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
        # Live Dubbing models
        LiveDubbingSession,
        # Live Feature Quota models (live dubbing & subtitle quotas)
        LiveFeatureQuota,
        LiveFeatureUsageSession,
        # Migration tracking models (script infrastructure)
        MigrationRecord,
        RollbackData,
        # NLP conversation session models
        NLPConversationSession,
        # Audible OAuth integration models
        UserAudibleAccount,
        # Location cache model
        LocationCache,
    ]

    # Conditionally add Olorin models based on database separation setting
    # When Phase 2 (separate database) is enabled, Olorin models are managed separately
    if not settings.olorin.database.use_separate_database:
        # Phase 1: Olorin models in main database
        document_models.extend(
            [
                IntegrationPartner,
                UsageRecord,
                DubbingSession,
                WebhookDelivery,
                ContentEmbedding,
                RecapSession,
                CulturalReference,
            ]
        )
        logger.info("Olorin models included in main database (Phase 1)")
    else:
        # Phase 2: Olorin models in separate database
        logger.info("Olorin models excluded from main database (Phase 2 - separate database)")

    # Initialize Beanie with document models using centralized database
    # Note: allow_index_dropping disabled to prevent errors on missing indexes
    # Use dedicated migration scripts (rebuild_all_indexes.py) for index management
    database = get_mongodb_database()
    try:
        await init_beanie(
            database=database,
            document_models=document_models,
            allow_index_dropping=False,
        )
    except Exception as e:
        # Index conflicts (e.g. TTL value changes) crash init_beanie before all
        # models are registered, leaving the server in DEGRADED mode. Retry with
        # skip_indexes=True so all models are still usable for queries.
        logger.warning(
            f"init_beanie failed during index creation ({type(e).__name__}: {e}). "
            "Retrying with skip_indexes=True - resolve index conflicts via migration scripts."
        )
        await init_beanie(
            database=database,
            document_models=document_models,
            skip_indexes=True,
        )
    logger.info(f"Connected to MongoDB via olorin-shared: {database.name}")

    # Create TTL indexes for automatic document expiration
    await ensure_ttl_indexes(database)


async def close_mongo_connection():
    """Close database connection using centralized olorin-shared connection."""
    await close_mongodb_connection()
    db.client = None
    logger.info("Closed MongoDB connection via olorin-shared")


def get_database():
    """Get MongoDB database using centralized olorin-shared connection."""
    return get_mongodb_database()
