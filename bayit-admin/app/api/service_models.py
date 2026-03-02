"""
Beanie document model subset for Bayit+ Admin Service.

Defines the ~50 models needed by admin routes. Used by connect_to_mongo_subset()
to initialize only the models this service requires (vs 120+ in the monolith).
"""

from app.models.admin import (
    AuditLog, Campaign, EmailCampaign, PushNotification,
    Refund, SubscriptionPlan, SystemSettings, Transaction,
)
from app.models.character import Character
from app.models.content import (
    Content, EPGEntry, LiveChannel, Podcast, PodcastEpisode, RadioStation,
)
from app.models.content_taxonomy import (
    Audience, ContentSection, Genre, SectionSubcategory,
)
from app.models.cost_breakdown import CostBreakdown, UserCostBreakdown
from app.models.culture import (
    Culture, CultureCity, CultureContentItem, CultureNewsSource,
)
from app.models.diagnostics import ClientAlert, ClientHealthHistory, ClientHeartbeat
from app.models.kids_content import KidsContentSource
from app.models.librarian import (
    AuditReport, ClassificationVerificationCache, LibrarianAction,
    StreamValidationCache,
)
from app.models.migration import MigrationRecord
from app.models.profile import Profile
from app.models.recording import Recording, RecordingSchedule, RecordingSession
from app.models.security_audit import SecurityAuditLog
from app.models.subscription import Invoice, Subscription
from app.models.subtitles import SubtitleTrackDoc
from app.models.upload import (
    BrowserUploadSession, MonitoredFolder, UploadHashLock, UploadJob, UploadStats,
)
from app.models.user import User
from app.models.user_system_widget import UserSystemWidget
from app.models.vod_interaction import VODInteractionSession
from app.models.voice_config import VoiceConfiguration
from app.models.widget import Widget
from app.models.youngsters_content import YoungstersContentSource

SERVICE_MODELS: list = [
    User, Content, LiveChannel, Podcast, PodcastEpisode, RadioStation, EPGEntry,
    Recording, RecordingSchedule, RecordingSession, Subscription, Invoice,
    AuditLog, Transaction, Refund, Campaign, EmailCampaign, PushNotification,
    SystemSettings, SubscriptionPlan, CostBreakdown, UserCostBreakdown,
    SecurityAuditLog, UploadJob, MonitoredFolder, UploadStats,
    BrowserUploadSession, UploadHashLock, AuditReport, LibrarianAction,
    StreamValidationCache, ClassificationVerificationCache,
    ClientHeartbeat, ClientHealthHistory, ClientAlert,
    Widget, UserSystemWidget, MigrationRecord,
    ContentSection, SectionSubcategory, Genre, Audience,
    KidsContentSource, YoungstersContentSource,
    Culture, CultureCity, CultureNewsSource, CultureContentItem,
    Character, VoiceConfiguration, VODInteractionSession, Profile,
    SubtitleTrackDoc,
]
