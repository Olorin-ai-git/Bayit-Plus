"""
Live Feature Quota Service
Manages and enforces usage limits for live subtitles and dubbing features
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

from app.models.live_feature_quota import (FeatureType, LiveFeatureQuota,
                                             LiveFeatureUsageSession,
                                             UsageSessionStatus, UsageStats)
from app.models.user import User

logger = logging.getLogger(__name__)

# Cost estimation constants (USD per unit)
# Based on typical cloud AI service pricing
COST_STT_PER_MINUTE = 0.006  # ElevenLabs Scribe: ~$0.36/hour
COST_TRANSLATION_PER_1K_CHARS = 0.020  # Google Translate
COST_TTS_PER_1K_CHARS = 0.016  # ElevenLabs TTS

# Average character counts per minute of audio
AVG_CHARS_PER_MINUTE = {
    "he": 600,  # Hebrew: ~150 words/min * 4 chars/word
    "en": 750,  # English: ~150 words/min * 5 chars/word
    "es": 700,  # Spanish: similar to English
}

# Default quota values by subscription tier (minutes)
QUOTA_DEFAULTS = {
    "premium": {
        "subtitle_minutes_per_hour": 60,
        "subtitle_minutes_per_day": 240,
        "subtitle_minutes_per_month": 2000,
        "dubbing_minutes_per_hour": 30,
        "dubbing_minutes_per_day": 120,
        "dubbing_minutes_per_month": 1000,
    },
    "family": {
        "subtitle_minutes_per_hour": 120,
        "subtitle_minutes_per_day": 480,
        "subtitle_minutes_per_month": 4000,
        "dubbing_minutes_per_hour": 60,
        "dubbing_minutes_per_day": 240,
        "dubbing_minutes_per_month": 2000,
    },
}


class LiveFeatureQuotaService:
    """Service for managing and enforcing live feature quotas"""

    @staticmethod
    async def get_or_create_quota(user_id: str) -> LiveFeatureQuota:
        """Get quota for user, create with defaults if doesn't exist"""
        quota = await LiveFeatureQuota.find_one(LiveFeatureQuota.user_id == user_id)

        if not quota:
            user = await User.get(user_id)
            tier = user.subscription_tier if user else "premium"
            defaults = QUOTA_DEFAULTS.get(tier, QUOTA_DEFAULTS["premium"])

            quota = LiveFeatureQuota(
                user_id=user_id,
                **defaults,
            )
            await quota.insert()
            logger.info(f"Created quota for user {user_id} with tier {tier}")

        return quota

    @staticmethod
    async def _reset_windows_and_rollover(quota: LiveFeatureQuota) -> bool:
        """
        Reset time windows if expired and handle rollover accumulation.
        Returns True if any window was reset.
        """
        now = datetime.utcnow()
        updated = False

        # Hourly reset with rollover
        if now - quota.last_hour_reset >= timedelta(hours=1):
            # Calculate unused minutes for rollover
            unused_subtitle = max(
                0, quota.subtitle_minutes_per_hour - quota.subtitle_usage_current_hour
            )
            unused_dubbing = max(
                0, quota.dubbing_minutes_per_hour - quota.dubbing_usage_current_hour
            )

            # Add to accumulated (capped at limit * rollover_multiplier)
            max_subtitle_rollover = (
                quota.subtitle_minutes_per_hour * quota.max_rollover_multiplier
            )
            max_dubbing_rollover = (
                quota.dubbing_minutes_per_hour * quota.max_rollover_multiplier
            )

            quota.accumulated_subtitle_minutes = min(
                quota.accumulated_subtitle_minutes + unused_subtitle,
                max_subtitle_rollover,
            )
            quota.accumulated_dubbing_minutes = min(
                quota.accumulated_dubbing_minutes + unused_dubbing,
                max_dubbing_rollover,
            )

            # Reset hourly usage
            quota.subtitle_usage_current_hour = 0.0
            quota.dubbing_usage_current_hour = 0.0
            quota.last_hour_reset = now
            updated = True

            logger.info(
                f"Hourly reset for user {quota.user_id}: "
                f"subtitle_rollover={quota.accumulated_subtitle_minutes:.1f}, "
                f"dubbing_rollover={quota.accumulated_dubbing_minutes:.1f}"
            )

        # Daily reset (no rollover for daily/monthly)
        if now - quota.last_day_reset >= timedelta(days=1):
            quota.subtitle_usage_current_day = 0.0
            quota.dubbing_usage_current_day = 0.0
            quota.last_day_reset = now
            updated = True

        # Monthly reset
        if now - quota.last_month_reset >= timedelta(days=30):
            quota.subtitle_usage_current_month = 0.0
            quota.dubbing_usage_current_month = 0.0
            quota.estimated_cost_current_month = 0.0
            quota.last_month_reset = now
            updated = True

        if updated:
            quota.updated_at = now
            await quota.save()

        return updated

    @staticmethod
    async def check_quota(
        user_id: str,
        feature_type: FeatureType,
        estimated_duration_minutes: float = 1.0,
    ) -> Tuple[bool, Optional[str], Dict]:
        """
        Check if user has quota available (with rollover support).

        Args:
            user_id: User ID to check
            feature_type: Type of feature (subtitle or dubbing)
            estimated_duration_minutes: Estimated session duration

        Returns:
            Tuple of (allowed, error_message, usage_stats)
        """
        try:
            quota = await LiveFeatureQuotaService.get_or_create_quota(user_id)
            await LiveFeatureQuotaService._reset_windows_and_rollover(quota)

            is_subtitle = feature_type == FeatureType.SUBTITLE

            # Get current usage and limits
            if is_subtitle:
                current_hour = quota.subtitle_usage_current_hour
                current_day = quota.subtitle_usage_current_day
                current_month = quota.subtitle_usage_current_month
                limit_hour = quota.subtitle_minutes_per_hour
                limit_day = quota.subtitle_minutes_per_day
                limit_month = quota.subtitle_minutes_per_month
                accumulated = quota.accumulated_subtitle_minutes
            else:
                current_hour = quota.dubbing_usage_current_hour
                current_day = quota.dubbing_usage_current_day
                current_month = quota.dubbing_usage_current_month
                limit_hour = quota.dubbing_minutes_per_hour
                limit_day = quota.dubbing_minutes_per_day
                limit_month = quota.dubbing_minutes_per_month
                accumulated = quota.accumulated_dubbing_minutes

            # Calculate total available (limit + rollover)
            available_hour = limit_hour + accumulated - current_hour
            available_day = limit_day - current_day
            available_month = limit_month - current_month

            # Build usage stats
            usage_stats = LiveFeatureQuotaService._build_usage_stats(quota)

            # Check hourly limit (with rollover)
            if current_hour + estimated_duration_minutes > limit_hour + accumulated:
                return (
                    False,
                    f"Hourly limit reached for {feature_type.value}. "
                    f"Used {current_hour:.1f} of {limit_hour + accumulated:.1f} minutes. "
                    f"Resets in {60 - datetime.utcnow().minute} minutes.",
                    usage_stats,
                )

            # Check daily limit
            if current_day + estimated_duration_minutes > limit_day:
                hours_until_reset = 24 - datetime.utcnow().hour
                return (
                    False,
                    f"Daily limit reached for {feature_type.value}. "
                    f"Used {current_day:.1f} of {limit_day} minutes. "
                    f"Resets in {hours_until_reset} hours.",
                    usage_stats,
                )

            # Check monthly limit
            if current_month + estimated_duration_minutes > limit_month:
                return (
                    False,
                    f"Monthly limit reached for {feature_type.value}. "
                    f"Used {current_month:.1f} of {limit_month} minutes. "
                    f"Resets next month.",
                    usage_stats,
                )

            # All checks passed
            return (True, None, usage_stats)

        except Exception as e:
            logger.error(f"Error checking quota for user {user_id}: {str(e)}")
            return (
                False,
                f"Error checking quota: {str(e)}",
                {},
            )

    @staticmethod
    def _build_usage_stats(quota: LiveFeatureQuota) -> Dict:
        """Build usage statistics dictionary"""
        return {
            "subtitle_usage_current_hour": quota.subtitle_usage_current_hour,
            "subtitle_usage_current_day": quota.subtitle_usage_current_day,
            "subtitle_usage_current_month": quota.subtitle_usage_current_month,
            "subtitle_minutes_per_hour": quota.subtitle_minutes_per_hour,
            "subtitle_minutes_per_day": quota.subtitle_minutes_per_day,
            "subtitle_minutes_per_month": quota.subtitle_minutes_per_month,
            "subtitle_available_hour": max(
                0,
                quota.subtitle_minutes_per_hour
                + quota.accumulated_subtitle_minutes
                - quota.subtitle_usage_current_hour,
            ),
            "subtitle_available_day": max(
                0, quota.subtitle_minutes_per_day - quota.subtitle_usage_current_day
            ),
            "subtitle_available_month": max(
                0, quota.subtitle_minutes_per_month - quota.subtitle_usage_current_month
            ),
            "accumulated_subtitle_minutes": quota.accumulated_subtitle_minutes,
            "dubbing_usage_current_hour": quota.dubbing_usage_current_hour,
            "dubbing_usage_current_day": quota.dubbing_usage_current_day,
            "dubbing_usage_current_month": quota.dubbing_usage_current_month,
            "dubbing_minutes_per_hour": quota.dubbing_minutes_per_hour,
            "dubbing_minutes_per_day": quota.dubbing_minutes_per_day,
            "dubbing_minutes_per_month": quota.dubbing_minutes_per_month,
            "dubbing_available_hour": max(
                0,
                quota.dubbing_minutes_per_hour
                + quota.accumulated_dubbing_minutes
                - quota.dubbing_usage_current_hour,
            ),
            "dubbing_available_day": max(
                0, quota.dubbing_minutes_per_day - quota.dubbing_usage_current_day
            ),
            "dubbing_available_month": max(
                0, quota.dubbing_minutes_per_month - quota.dubbing_usage_current_month
            ),
            "accumulated_dubbing_minutes": quota.accumulated_dubbing_minutes,
            "estimated_cost_current_month": quota.estimated_cost_current_month,
            "warning_threshold_percentage": quota.warning_threshold_percentage,
        }

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
    def _estimate_session_cost(
        minutes: float,
        source_lang: str,
        target_lang: str,
        feature_type: FeatureType,
    ) -> Dict[str, float]:
        """Estimate costs for a session"""
        stt_cost = minutes * COST_STT_PER_MINUTE

        chars_processed = minutes * AVG_CHARS_PER_MINUTE.get(source_lang, 700)
        translation_cost = (chars_processed / 1000) * COST_TRANSLATION_PER_1K_CHARS

        # TTS only for dubbing, not subtitles
        tts_cost = 0.0
        if feature_type == FeatureType.DUBBING:
            tts_cost = (chars_processed / 1000) * COST_TTS_PER_1K_CHARS

        return {
            "stt_cost": round(stt_cost, 4),
            "translation_cost": round(translation_cost, 4),
            "tts_cost": round(tts_cost, 4),
            "total_cost": round(stt_cost + translation_cost + tts_cost, 4),
        }

    @staticmethod
    async def update_session(
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
            datetime.utcnow() - session.started_at
        ).total_seconds()
        session.last_activity_at = datetime.utcnow()

        # Calculate incremental cost
        minutes_delta = audio_seconds_delta / 60.0
        cost_delta = LiveFeatureQuotaService._estimate_session_cost(
            minutes_delta,
            session.source_language or "he",
            session.target_language or "en",
            session.feature_type,
        )

        session.estimated_stt_cost += cost_delta["stt_cost"]
        session.estimated_translation_cost += cost_delta["translation_cost"]
        session.estimated_tts_cost += cost_delta["tts_cost"]
        session.estimated_total_cost += cost_delta["total_cost"]

        session.updated_at = datetime.utcnow()
        await session.save()

        # Update user quota
        quota = await LiveFeatureQuotaService.get_or_create_quota(session.user_id)

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

        quota.updated_at = datetime.utcnow()
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
        session.ended_at = datetime.utcnow()
        session.duration_seconds = (session.ended_at - session.started_at).total_seconds()
        session.updated_at = datetime.utcnow()
        await session.save()

        logger.info(
            f"Ended {session.feature_type.value} session {session_id} "
            f"with status {status.value}: "
            f"{session.audio_seconds_processed:.1f}s processed, "
            f"cost ${session.estimated_total_cost:.4f}"
        )

    @staticmethod
    async def get_usage_stats(user_id: str) -> Dict:
        """Get current usage stats for user"""
        quota = await LiveFeatureQuotaService.get_or_create_quota(user_id)
        await LiveFeatureQuotaService._reset_windows_and_rollover(quota)
        return LiveFeatureQuotaService._build_usage_stats(quota)

    @staticmethod
    async def reset_user_quota(user_id: str):
        """Reset all usage counters (admin action)"""
        quota = await LiveFeatureQuotaService.get_or_create_quota(user_id)

        quota.subtitle_usage_current_hour = 0.0
        quota.subtitle_usage_current_day = 0.0
        quota.subtitle_usage_current_month = 0.0

        quota.dubbing_usage_current_hour = 0.0
        quota.dubbing_usage_current_day = 0.0
        quota.dubbing_usage_current_month = 0.0

        quota.accumulated_subtitle_minutes = 0.0
        quota.accumulated_dubbing_minutes = 0.0

        quota.estimated_cost_current_month = 0.0

        quota.updated_at = datetime.utcnow()
        await quota.save()

        logger.info(f"Reset quota for user {user_id}")

    @staticmethod
    async def extend_user_limits(
        user_id: str,
        admin_id: str,
        new_limits: Dict,
        notes: Optional[str] = None,
    ):
        """Admin extends user limits"""
        quota = await LiveFeatureQuotaService.get_or_create_quota(user_id)

        # Update limits from dict
        for key, value in new_limits.items():
            if hasattr(quota, key):
                setattr(quota, key, value)

        quota.notes = notes
        quota.limit_extended_by = admin_id
        quota.limit_extended_at = datetime.utcnow()
        quota.updated_at = datetime.utcnow()

        await quota.save()

        logger.info(f"Extended limits for user {user_id} by admin {admin_id}")


# Singleton instance
live_feature_quota_service = LiveFeatureQuotaService()
