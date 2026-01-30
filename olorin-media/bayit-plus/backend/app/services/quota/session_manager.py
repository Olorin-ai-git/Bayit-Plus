"""
Session Manager - Handles live feature session lifecycle and cost tracking
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

from app.core.config import settings
from app.models.live_feature_quota import (FeatureType,
                                           LiveFeatureUsageSession,
                                           UsageSessionStatus)

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages live feature session lifecycle and usage tracking"""

    @staticmethod
    async def start_session(
        user_id: str,
        channel_id: str,
        feature_type: FeatureType,
        source_language: Optional[str] = None,
        target_language: Optional[str] = None,
        platform: str = "web",
    ) -> LiveFeatureUsageSession:
        """Start tracking a new usage session"""
        session = LiveFeatureUsageSession(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            channel_id=channel_id,
            feature_type=feature_type,
            source_language=source_language,
            target_language=target_language,
            platform=platform,
        )
        await session.insert()

        logger.info(
            f"Started {feature_type.value} session {session.session_id} "
            f"for user {user_id} on channel {channel_id}"
        )

        return session

    @staticmethod
    def estimate_session_cost(
        minutes: float,
        source_lang: str,
        target_lang: str,
        feature_type: FeatureType,
    ) -> Dict[str, float]:
        """Estimate costs for a session using configuration values"""
        stt_cost = minutes * settings.LIVE_QUOTA_COST_STT_PER_MINUTE

        # Get average chars per minute based on source language
        if source_lang == "he":
            avg_chars = settings.LIVE_QUOTA_AVG_CHARS_PER_MINUTE_HEBREW
        elif source_lang == "en":
            avg_chars = settings.LIVE_QUOTA_AVG_CHARS_PER_MINUTE_ENGLISH
        else:
            # Default to average of Hebrew and English
            avg_chars = (
                settings.LIVE_QUOTA_AVG_CHARS_PER_MINUTE_HEBREW
                + settings.LIVE_QUOTA_AVG_CHARS_PER_MINUTE_ENGLISH
            ) // 2

        chars_processed = minutes * avg_chars
        translation_cost = (
            chars_processed / 1000
        ) * settings.LIVE_QUOTA_COST_TRANSLATION_PER_1K_CHARS

        # TTS only for dubbing, not subtitles
        tts_cost = 0.0
        if feature_type == FeatureType.DUBBING:
            tts_cost = (
                chars_processed / 1000
            ) * settings.LIVE_QUOTA_COST_TTS_PER_1K_CHARS

        return {
            "stt_cost": round(stt_cost, 4),
            "translation_cost": round(translation_cost, 4),
            "tts_cost": round(tts_cost, 4),
            "total_cost": round(stt_cost + translation_cost + tts_cost, 4),
        }

    @staticmethod
    async def update_session(
        quota_manager,
        session_id: str,
        audio_seconds_delta: float,
        segments_delta: int = 0,
        chars_processed: int = 0,
    ):
        """Update session with usage increments"""
        session = await LiveFeatureUsageSession.find_one(
            LiveFeatureUsageSession.session_id == session_id
        )

        if not session:
            logger.error(f"Session {session_id} not found")
            return

        # Update session metrics
        session.audio_seconds_processed += audio_seconds_delta
        session.segments_processed += segments_delta
        session.duration_seconds = (
            datetime.now(timezone.utc) - session.started_at
        ).total_seconds()
        session.last_activity_at = datetime.now(timezone.utc)

        # Calculate incremental cost
        minutes_delta = audio_seconds_delta / 60.0
        cost_delta = SessionManager.estimate_session_cost(
            minutes_delta,
            session.source_language or "he",
            session.target_language or "en",
            session.feature_type,
        )

        session.estimated_stt_cost += cost_delta["stt_cost"]
        session.estimated_translation_cost += cost_delta["translation_cost"]
        session.estimated_tts_cost += cost_delta["tts_cost"]
        session.estimated_total_cost += cost_delta["total_cost"]

        session.updated_at = datetime.now(timezone.utc)
        await session.save()

        # Update user quota
        quota = await quota_manager.get_or_create_quota(session.user_id)

        is_subtitle = session.feature_type == FeatureType.SUBTITLE

        if is_subtitle:
            quota.subtitle_usage_current_hour += minutes_delta
            quota.subtitle_usage_current_day += minutes_delta
            quota.subtitle_usage_current_month += minutes_delta
            # Deduct from accumulated rollover first
            if quota.accumulated_subtitle_minutes > 0:
                deduction = min(minutes_delta, quota.accumulated_subtitle_minutes)
                quota.accumulated_subtitle_minutes -= deduction
        else:
            quota.dubbing_usage_current_hour += minutes_delta
            quota.dubbing_usage_current_day += minutes_delta
            quota.dubbing_usage_current_month += minutes_delta
            # Deduct from accumulated rollover first
            if quota.accumulated_dubbing_minutes > 0:
                deduction = min(minutes_delta, quota.accumulated_dubbing_minutes)
                quota.accumulated_dubbing_minutes -= deduction

        # Update cost tracking
        quota.estimated_cost_current_month += cost_delta["total_cost"]
        quota.total_lifetime_cost += cost_delta["total_cost"]

        quota.updated_at = datetime.now(timezone.utc)
        await quota.save()

    @staticmethod
    async def end_session(session_id: str, status: UsageSessionStatus):
        """Finalize session and update totals"""
        session = await LiveFeatureUsageSession.find_one(
            LiveFeatureUsageSession.session_id == session_id
        )

        if not session:
            logger.error(f"Session {session_id} not found")
            return

        session.status = status
        session.ended_at = datetime.now(timezone.utc)
        session.duration_seconds = (
            session.ended_at - session.started_at
        ).total_seconds()
        session.updated_at = datetime.now(timezone.utc)
        await session.save()

        logger.info(
            f"Ended {session.feature_type.value} session {session_id} "
            f"with status {status.value}: "
            f"{session.audio_seconds_processed:.1f}s processed, "
            f"cost ${session.estimated_total_cost:.4f}"
        )
