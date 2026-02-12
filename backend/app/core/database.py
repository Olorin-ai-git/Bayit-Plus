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
from app.models.ai_generation_job import AIGenerationJob
from app.models.audio_tracks import AudioTrackDoc
# Beta 500 program models
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.models.cost_breakdown import CostBreakdown, UserCostBreakdown
from app.models.chapters import VideoChapters
from app.models.channel_chat import (
    ChannelChatMessage,
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
from app.models.household import Household
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
# Quiz feature models
from app.models.quiz import ContentQuiz
from app.models.quiz_attempt import QuizAttempt
# Comprehension quiz feature models
from app.models.comprehension import ContentComprehension
from app.models.comprehension_attempt import ComprehensionAttempt
from app.models.reward import Badge, UserReward
# Models
from app.models.user import User
from app.models.user_system_widget import UserSystemWidget
from app.models.playback_session import PlaybackSession
from app.models.notification_event import NotificationEvent, NotificationMetrics
from app.models.passkey_credential import PasskeyCredential, PasskeySession, PasskeyChallenge
from app.models.voice_config import VoiceConfiguration, VoiceProviderHealth
from app.models.verification import VerificationToken
from app.models.watchlist import Conversation, WatchHistory
from app.models.playlist import PlaylistItem
from app.models.widget import Widget
from app.models.youngsters_content import YoungstersContentSource
from app.services.mcp_content_discovery import ContentDiscoveryQueue
# Public domain documentary import models
from app.services.public_domain_doc_importer.sync_tracker import DocSyncState
# Migration tracking models
from app.models.migration import MigrationRecord, RollbackData
# NLP models
from app.models.nlp_session import NLPConversationSession
from app.models.user_audible_account import UserAudibleAccount
from app.models.diagnostics import ClientHeartbeat, ClientHealthHistory, ClientAlert
# User dubbing session and quota models
from app.models.dubbing.session import UserDubbingSession, UserQuota
# Transcript Event Bus models (highlights, search index)
from app.models.highlight import LiveHighlight
from app.models.live_transcript_index import LiveTranscriptIndex
# Hebrew engagement feature models
from app.models.phrase_breakdown import PhraseBreakdown
from app.models.daily_mission import MissionTemplate, UserMission
from app.models.shekel_currency import ShekelWallet, ShekelTransaction
from app.models.leaderboard import LeaderboardEntry
from app.models.zine import WeeklyZine
from app.models.coupon import Coupon, CouponRedemption
from app.models.child_proficiency import ChildProficiency
from app.models.talk_back_point import ContentTalkBack
from app.models.talk_back_attempt import TalkBackAttempt
from app.models.bilingual_dubbing_session import BilingualDubbingSession
# Star in Story models
from app.models.child_avatar import ChildAvatar
from app.models.story_episode import StoryEpisode
from app.models.story_generation_job import StoryGenerationJob
# Interactive Mission models (Atzmi Ba'Sipur)
from app.models.interactive_mission import InteractiveMission
from app.models.avatar_outfit import AvatarOutfit
from app.models.family_snap import FamilySnap
# Phonetic Mirror models (Perfected Voice)
from app.models.phonetic_mirror_attempt import PhoneticMirrorAttempt
# Gamification models (Level Progression)
from app.models.gamification_profile import GamificationProfile
# Grandparent Bridge models (news clips + voice notes)
from app.models.grandparent_bridge import GrandparentVoiceNote, NewsClip
# Chameleon Engine models (avatar style cache)
from app.models.avatar_style_cache import AvatarStyleCache


class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def _cleanup_stale_indexes(database):
    """
    Drop indexes left behind by removed models to prevent DuplicateKeyError on startup.

    ChatTranslationCacheEntry was removed (conflicted with ChatTranslationCacheDoc on the
    same collection). Its unique index on (message_id, language) causes E11000 errors
    because documents from the active model don't have those fields (null duplicates).
    """
    stale_indexes = {
        "chat_translation_cache": ["message_language_unique_idx", "cache_ttl_idx"],
    }
    for collection_name, index_names in stale_indexes.items():
        collection = database[collection_name]
        for index_name in index_names:
            try:
                await collection.drop_index(index_name)
                logger.info(
                    "Dropped stale index",
                    extra={"collection": collection_name, "index": index_name},
                )
            except Exception as e:
                if "not found" in str(e).lower() or "IndexNotFound" in str(e):
                    pass
                else:
                    logger.warning(
                        "Failed to drop stale index",
                        extra={
                            "collection": collection_name,
                            "index": index_name,
                            "error": str(e),
                        },
                    )


async def ensure_ttl_indexes(database):
    """
    Create TTL (Time To Live) indexes for automatic document expiration.

    TTL indexes cannot be defined in Beanie model Settings because they require
    the `expireAfterSeconds` parameter. We create them manually during startup.
    """
    # Clean up indexes from removed models first
    await _cleanup_stale_indexes(database)

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
            logger.debug(
                "TTL index already exists on chat_translation_cache",
                extra={"error": str(e)},
            )
        else:
            logger.warning(
                "Failed to create TTL index on chat_translation_cache",
                extra={"error": str(e)},
            )


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
        # Quiz models (kids interactive quizzes)
        ContentQuiz,
        QuizAttempt,
        # Comprehension quiz models (scene-triggered questions)
        ContentComprehension,
        ComprehensionAttempt,
        Badge,
        UserReward,
        # Subtitle models
        SubtitleTrackDoc,
        TranslationCacheDoc,
        SubtitleSearchCacheDoc,
        SubtitleQuotaTrackerDoc,
        SubtitlePreference,
        AIGenerationJob,
        AudioTrackDoc,
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
        Household,
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
        # Transcript Event Bus models (highlights, search index)
        LiveHighlight,
        LiveTranscriptIndex,
        # User dubbing session and quota models
        UserDubbingSession,
        UserQuota,
        # Unified playlist model (merged watchlist + playlist)
        PlaylistItem,
        # Public domain documentary import sync tracking
        DocSyncState,
        # Hebrew engagement feature models
        PhraseBreakdown,
        MissionTemplate,
        UserMission,
        ShekelWallet,
        ShekelTransaction,
        LeaderboardEntry,
        WeeklyZine,
        Coupon,
        CouponRedemption,
        ChildProficiency,
        ContentTalkBack,
        TalkBackAttempt,
        BilingualDubbingSession,
        # Star in Story models
        ChildAvatar,
        StoryEpisode,
        StoryGenerationJob,
        # Interactive Mission models (Atzmi Ba'Sipur)
        InteractiveMission,
        AvatarOutfit,
        FamilySnap,
        # Phonetic Mirror models (Perfected Voice)
        PhoneticMirrorAttempt,
        # Gamification models (Level Progression)
        GamificationProfile,
        # Grandparent Bridge models (news clips + voice notes)
        NewsClip,
        GrandparentVoiceNote,
        # Chameleon Engine models (avatar style cache)
        AvatarStyleCache,
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
    # Always skip index creation/verification during startup for fast boot (~12s saved).
    # Indexes are managed via dedicated migration scripts (rebuild_all_indexes.py).
    database = get_mongodb_database()

    await init_beanie(
        database=database,
        document_models=document_models,
        skip_indexes=True,
    )
    logger.info(f"Connected to MongoDB via olorin-shared: {database.name}")


async def ensure_ttl_indexes_background():
    """Run TTL index creation in background after server is ready to accept connections."""
    database = get_mongodb_database()
    await ensure_ttl_indexes(database)


async def close_mongo_connection():
    """Close database connection using centralized olorin-shared connection."""
    await close_mongodb_connection()
    db.client = None
    logger.info("Closed MongoDB connection via olorin-shared")


def get_database():
    """Get MongoDB database using centralized olorin-shared connection."""
    return get_mongodb_database()
