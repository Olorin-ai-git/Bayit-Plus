"""Router registry for Bayit+ AI Service -- all AI-powered feature routes."""

import logging

from fastapi import FastAPI

from app.core.config import settings
from app.models.user import User
from app.models.content import Content, LiveChannel
from app.models.profile import Profile
from app.models.subscription import Subscription
from app.models.vod_interaction import VODInteractionSession
from app.models.watchlist import Conversation
from app.models.nlp_session import NLPConversationSession
from app.models.bilingual_dubbing_session import BilingualDubbingSession
from app.models.dubbing.session import UserDubbingSession, UserQuota
from app.models.live_dubbing import LiveDubbingSession
from app.models.live_feature_quota import LiveFeatureQuota, LiveFeatureUsageSession
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.models.gamification_profile import GamificationProfile
from app.models.daily_mission import MissionTemplate, UserMission
from app.models.shekel_currency import ShekelWallet, ShekelTransaction
from app.models.leaderboard import LeaderboardEntry
from app.models.zine import WeeklyZine
from app.models.coupon import Coupon, CouponRedemption
from app.models.child_avatar import ChildAvatar
from app.models.child_proficiency import ChildProficiency
from app.models.family_controls import FamilyControls
from app.models.talk_back_point import ContentTalkBack
from app.models.talk_back_attempt import TalkBackAttempt
from app.models.phonetic_mirror_attempt import PhoneticMirrorAttempt
from app.models.story_episode import StoryEpisode
from app.models.story_generation_job import StoryGenerationJob
from app.models.interactive_mission import InteractiveMission
from app.models.avatar_outfit import AvatarOutfit
from app.models.family_snap import FamilySnap
from app.models.avatar_mesh import AvatarMesh
from app.models.biometric_consent import BiometricConsent
from app.models.v2v_session import V2VSession
from app.models.scene_trigger import ContentSceneTriggers
from app.models.magic_mirror import MagicMirrorGreeting
from app.models.highlight_reel import HighlightReel
from app.models.whatsapp_contact import WhatsAppContact
from app.models.character import Character
from app.models.trivia import ContentTrivia
from app.models.quiz import ContentQuiz
from app.models.quiz_attempt import QuizAttempt
from app.models.comprehension import ContentComprehension
from app.models.comprehension_attempt import ComprehensionAttempt
from app.models.reward import Badge, UserReward
from app.models.phrase_breakdown import PhraseBreakdown
from app.models.grandparent_bridge import GrandparentVoiceNote, NewsClip
from app.models.avatar_style_cache import AvatarStyleCache
from app.models.audio_tracks import AudioTrackDoc
from app.models.ai_generation_job import AIGenerationJob
from app.models.search_analytics import SearchQuery

logger = logging.getLogger(__name__)

SERVICE_MODELS = [
    User, Content, LiveChannel, Profile, Subscription,
    VODInteractionSession, Conversation, NLPConversationSession, BilingualDubbingSession,
    UserDubbingSession, UserQuota, LiveDubbingSession, LiveFeatureQuota, LiveFeatureUsageSession,
    BetaCredit, BetaCreditTransaction,
    GamificationProfile, MissionTemplate, UserMission, ShekelWallet, ShekelTransaction,
    LeaderboardEntry, WeeklyZine, Coupon, CouponRedemption,
    ChildAvatar, ChildProficiency, FamilyControls,
    ContentTalkBack, TalkBackAttempt,
    PhoneticMirrorAttempt,
    StoryEpisode, StoryGenerationJob,
    InteractiveMission, AvatarOutfit, FamilySnap,
    AvatarMesh, BiometricConsent, V2VSession, ContentSceneTriggers,
    MagicMirrorGreeting, HighlightReel, WhatsAppContact,
    Character, ContentTrivia, ContentQuiz, QuizAttempt,
    ContentComprehension, ComprehensionAttempt, Badge, UserReward,
    PhraseBreakdown, GrandparentVoiceNote, NewsClip,
    AvatarStyleCache, AudioTrackDoc, AIGenerationJob, SearchQuery,
]


def register_routes(app: FastAPI) -> None:
    """Register all AI feature routes with the FastAPI application."""
    prefix = settings.API_V1_PREFIX

    # Social / Chat
    from app.api.routes import chat, voice
    app.include_router(chat.router, prefix=f"{prefix}/chat", tags=["chat"])
    app.include_router(voice.router, prefix=f"{prefix}/voice", tags=["voice"])

    # AI Features (avatar dialogue, quiz, rewards, comprehension, cultural context)
    from app.api.routes import avatar_dialogue, quiz, rewards, comprehension, cultural_context_user
    app.include_router(avatar_dialogue.router, prefix=prefix, tags=["avatar-dialogue"])
    app.include_router(quiz.router, prefix=f"{prefix}/quiz", tags=["quiz"])
    app.include_router(rewards.router, prefix=f"{prefix}/rewards", tags=["rewards"])
    app.include_router(comprehension.router, prefix=f"{prefix}/comprehension", tags=["comprehension"])
    app.include_router(cultural_context_user.router, prefix=prefix, tags=["cultural-context"])

    # VOD Interactions (non-admin)
    from app.api.routes import (
        vod_interactions, vod_interaction_reels,
        vod_interaction_multi, vod_interaction_shared, vod_interaction_pause_ask,
    )
    app.include_router(vod_interactions.router, prefix=prefix, tags=["vod-interactions"])
    app.include_router(vod_interaction_reels.router, prefix=prefix, tags=["vod-interaction-reels"])
    app.include_router(vod_interaction_multi.router, prefix=prefix, tags=["vod-interaction-multi"])
    app.include_router(vod_interaction_shared.router, prefix=prefix, tags=["vod-interaction-shared"])
    app.include_router(vod_interaction_pause_ask.router, prefix=prefix, tags=["vod-interaction-pause-ask"])

    # Live Dubbing (REST)
    from app.api.routes import live_dubbing
    app.include_router(live_dubbing.router, prefix=prefix, tags=["live-dubbing"])

    # User Dubbing (Chrome Extension B2C)
    from app.api.routes import dubbing
    app.include_router(dubbing.router, prefix=f"{prefix}/dubbing", tags=["dubbing"])

    # NLP (intent parsing, agent execution, semantic search, voice commands)
    from app.api.routes import nlp
    app.include_router(nlp.router, prefix=prefix, tags=["nlp"])

    # Beta 500 Program
    from app.api.routes.beta import signup, credits, sessions, status
    app.include_router(signup.router, prefix=prefix, tags=["beta"])
    app.include_router(credits.router, prefix=prefix, tags=["beta-credits"])
    app.include_router(sessions.router, prefix=prefix, tags=["beta-sessions"])
    app.include_router(status.router, prefix=prefix, tags=["beta-status"])

    # Hebrew Engagement / Gamification (missions, shekels, leaderboard, zine, coupons)
    from app.api.routes.missions import missions_core, shekels, leaderboard, zine, coupons
    app.include_router(missions_core.router, prefix=prefix, tags=["missions"])
    app.include_router(shekels.router, prefix=prefix, tags=["shekels"])
    app.include_router(leaderboard.router, prefix=prefix, tags=["leaderboard"])
    app.include_router(zine.router, prefix=prefix, tags=["zine"])
    app.include_router(coupons.router, prefix=prefix, tags=["coupons"])

    # Talk Back (Hebrew voice interactivity)
    from app.api.routes.talk_back import talk_back_core, talk_back_admin, talk_back_dashboard
    app.include_router(talk_back_core.router, prefix=prefix, tags=["talk-back"])
    app.include_router(talk_back_admin.router, prefix=prefix, tags=["talk-back-admin"])
    app.include_router(talk_back_dashboard.router, prefix=prefix, tags=["talk-back-dashboard"])

    # Bilingual Dubbing (progressive Hebrew/English)
    from app.api.routes import bilingual_dubbing
    app.include_router(bilingual_dubbing.router, prefix=prefix, tags=["bilingual-dubbing"])

    # Star in Story (generative personalized episodes)
    from app.api.routes.star_story import star_story_core, star_story_admin
    app.include_router(star_story_core.router, prefix=prefix, tags=["star-story"])
    app.include_router(star_story_admin.router, prefix=prefix, tags=["star-story-admin"])

    # Interactive Mission (Atzmi Ba'Sipur)
    from app.api.routes.interactive_mission import mission_core as im_core, mission_play as im_play
    from app.api.routes import avatar_outfits, family_snaps
    app.include_router(im_core.router, prefix=prefix, tags=["interactive-missions"])
    app.include_router(im_play.router, prefix=prefix, tags=["interactive-missions"])
    app.include_router(avatar_outfits.router, prefix=prefix, tags=["avatar-outfits"])
    app.include_router(family_snaps.router, prefix=prefix, tags=["family-snaps"])

    # Phonetic Mirror (Perfected Voice)
    from app.api.routes.phonetic_mirror import mirror_core as pm_core
    app.include_router(pm_core.router, prefix=prefix, tags=["phonetic-mirror"])

    # Gamification (Level Progression)
    from app.api.routes.gamification import level_routes as gamification_routes
    app.include_router(gamification_routes.router, prefix=prefix, tags=["gamification"])

    # Grandparent Bridge (news clips, sharing, voice notes)
    from app.api.routes.grandparent_bridge import bridge_core as gp_bridge
    app.include_router(gp_bridge.router, prefix=prefix, tags=["grandparent-bridge"])

    # Chameleon Engine (visual style transfer)
    from app.api.routes.chameleon import style_routes as chameleon_routes
    app.include_router(chameleon_routes.router, prefix=prefix, tags=["chameleon"])

    # Zeh Ani (all phases: avatar, consent, V2V, triggers, mirror, highlights, WhatsApp)
    from app.api.routes.zeh_ani import (
        avatar_routes as za_avatar, consent_routes as za_consent,
        v2v_routes as za_v2v, trigger_routes as za_triggers,
        mirror_routes as za_mirror, highlight_routes as za_highlights,
        whatsapp_routes as za_whatsapp,
    )
    from app.api.routes import movie_interactions
    app.include_router(za_avatar.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_consent.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_v2v.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_triggers.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_mirror.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_highlights.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(za_whatsapp.router, prefix=prefix, tags=["zeh-ani"])
    app.include_router(movie_interactions.router, prefix=prefix, tags=["movie-interactions"])

    logger.info("All AI feature routes registered with prefix %s", prefix)
