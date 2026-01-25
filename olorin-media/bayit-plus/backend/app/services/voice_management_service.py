"""
Voice Management Service
Orchestrates voice configuration, testing, analytics, and provider management
"""

import asyncio
import base64
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.models.live_feature_quota import (FeatureType,
                                           LiveFeatureUsageSession,
                                           UsageSessionStatus)
from app.models.voice_config import VoiceConfiguration, VoiceProviderHealth
from app.services.elevenlabs_tts_streaming_service import \
    ElevenLabsTTSStreamingService

logger = logging.getLogger(__name__)


class VoiceManagementService:
    """Service for comprehensive voice management operations"""

    # Cache for ElevenLabs voices (1 hour TTL)
    _voices_cache: Optional[Dict[str, Any]] = None
    _voices_cache_expires_at: Optional[datetime] = None

    @staticmethod
    async def get_merged_configuration() -> Dict[str, Any]:
        """
        Get voice configuration with DB overrides merged into settings

        Returns merged configuration with priority:
        1. Database overrides (if exists and active)
        2. Environment config (settings)
        """
        base_config = {
            "default_voice_id": settings.ELEVENLABS_DEFAULT_VOICE_ID,
            "assistant_voice_id": settings.ELEVENLABS_ASSISTANT_VOICE_ID,
            "support_voice_id": settings.ELEVENLABS_SUPPORT_VOICE_ID,
            "stt_provider": settings.SPEECH_TO_TEXT_PROVIDER,
            "translation_provider": settings.LIVE_TRANSLATION_PROVIDER,
            "elevenlabs_api_key_configured": bool(settings.ELEVENLABS_API_KEY),
            "openai_api_key_configured": bool(settings.OPENAI_API_KEY),
            "google_api_key_configured": bool(settings.GOOGLE_API_KEY),
        }

        # Fetch active DB overrides
        overrides = await VoiceConfiguration.find(
            VoiceConfiguration.is_active == True  # noqa: E712
        ).to_list()

        for override in overrides:
            base_config[override.config_key] = override.config_value

        return base_config

    @staticmethod
    async def update_configuration(
        config_key: str,
        config_value: str,
        admin_id: str,
        config_type: str = "setting",
        language: Optional[str] = None,
        platform: Optional[str] = None,
        description: Optional[str] = None,
    ) -> VoiceConfiguration:
        """
        Update or create voice configuration override

        Args:
            config_key: Configuration key to update
            config_value: New value
            admin_id: Admin user ID making the change
            config_type: Type of configuration
            language: Language code if language-specific
            platform: Platform if platform-specific
            description: Human-readable description

        Returns:
            Updated or created VoiceConfiguration document
        """
        # Find existing config
        query = {"config_key": config_key}
        if language:
            query["language"] = language
        if platform:
            query["platform"] = platform

        existing = await VoiceConfiguration.find_one(query)

        if existing:
            # Update existing
            existing.config_value = config_value
            existing.updated_by = admin_id
            existing.updated_at = datetime.utcnow()
            if description:
                existing.description = description
            await existing.save()
            return existing
        else:
            # Create new
            config = VoiceConfiguration(
                config_key=config_key,
                config_value=config_value,
                config_type=config_type,
                language=language,
                platform=platform,
                description=description,
                created_by=admin_id,
                updated_by=admin_id,
            )
            await config.insert()
            return config

    @staticmethod
    async def test_voice(voice_id: str, text: str, language: str = "en") -> bytes:
        """
        Generate test audio using TTS service

        Args:
            voice_id: ElevenLabs voice ID to test
            text: Sample text to synthesize
            language: Language code

        Returns:
            Raw audio bytes (PCM format)

        Raises:
            Exception: If TTS generation fails
        """
        tts_service = ElevenLabsTTSStreamingService()
        audio_chunks = []

        try:
            await tts_service.connect(voice_id=voice_id)

            async for chunk in tts_service.generate_speech(text, voice_id, language):
                audio_chunks.append(chunk)

            return b"".join(audio_chunks)

        finally:
            await tts_service.close()

    @staticmethod
    async def fetch_elevenlabs_voices(
        force_refresh: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Fetch available voices from ElevenLabs API with caching

        Args:
            force_refresh: Bypass cache and fetch fresh data

        Returns:
            List of voice objects with metadata
        """
        # Check cache
        if (
            not force_refresh
            and VoiceManagementService._voices_cache is not None
            and VoiceManagementService._voices_cache_expires_at is not None
            and datetime.utcnow() < VoiceManagementService._voices_cache_expires_at
        ):
            return VoiceManagementService._voices_cache.get("voices", [])

        # Fetch from API
        if not settings.ELEVENLABS_API_KEY:
            logger.warning("ElevenLabs API key not configured")
            return []

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.elevenlabs.io/v1/voices",
                    headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                )
                response.raise_for_status()
                data = response.json()

                # Cache for 1 hour
                VoiceManagementService._voices_cache = data
                VoiceManagementService._voices_cache_expires_at = (
                    datetime.utcnow() + timedelta(hours=1)
                )

                return data.get("voices", [])

        except Exception as e:
            logger.error(f"Failed to fetch ElevenLabs voices: {e}")
            return []

    @staticmethod
    async def get_realtime_sessions(
        limit: int = 50, status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get active/recent voice usage sessions

        Args:
            limit: Maximum number of sessions to return
            status: Filter by session status

        Returns:
            List of session data dictionaries
        """
        query = {}
        if status:
            query["status"] = status

        sessions = (
            await LiveFeatureUsageSession.find(query)
            .sort([("started_at", -1)])
            .limit(limit)
            .to_list()
        )

        return [
            {
                "session_id": s.session_id,
                "user_id": s.user_id,
                "feature_type": s.feature_type,
                "status": s.status,
                "duration_seconds": s.duration_seconds,
                "started_at": s.started_at.isoformat(),
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "platform": s.platform,
                "estimated_total_cost": s.estimated_total_cost,
                "stt_latency_ms": s.stt_latency_ms,
                "tts_first_audio_ms": s.tts_first_audio_ms,
                "end_to_end_latency_ms": s.end_to_end_latency_ms,
            }
            for s in sessions
        ]

    @staticmethod
    async def get_usage_chart_data(
        period: str, feature_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get aggregated usage data for charts

        Args:
            period: Time period (day, week, month)
            feature_type: Optional filter by feature type

        Returns:
            Chart data with time series
        """
        # Calculate time range
        now = datetime.utcnow()
        if period == "day":
            start_time = now - timedelta(days=1)
            bucket_size = timedelta(hours=1)
        elif period == "week":
            start_time = now - timedelta(days=7)
            bucket_size = timedelta(days=1)
        else:  # month
            start_time = now - timedelta(days=30)
            bucket_size = timedelta(days=1)

        # Build query
        query = {"started_at": {"$gte": start_time}}
        if feature_type:
            query["feature_type"] = feature_type

        sessions = await LiveFeatureUsageSession.find(query).to_list()

        # Aggregate by time buckets
        buckets: Dict[str, Dict[str, float]] = {}
        current = start_time
        while current <= now:
            bucket_key = current.strftime("%Y-%m-%d %H:00")
            buckets[bucket_key] = {
                "duration_minutes": 0.0,
                "cost_usd": 0.0,
                "session_count": 0,
            }
            current += bucket_size

        for session in sessions:
            bucket_key = session.started_at.strftime("%Y-%m-%d %H:00")
            if bucket_key in buckets:
                buckets[bucket_key]["duration_minutes"] += session.duration_seconds / 60
                buckets[bucket_key]["cost_usd"] += session.estimated_total_cost
                buckets[bucket_key]["session_count"] += 1

        return {
            "period": period,
            "data": [{"timestamp": k, **v} for k, v in sorted(buckets.items())],
        }

    @staticmethod
    async def get_cost_breakdown(
        start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """
        Get cost breakdown by feature type and component

        Args:
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Cost breakdown data
        """
        sessions = await LiveFeatureUsageSession.find(
            {
                "started_at": {"$gte": start_date, "$lte": end_date},
                "status": {"$in": [UsageSessionStatus.COMPLETED]},
            }
        ).to_list()

        breakdown = {
            "total_cost": 0.0,
            "by_feature": {"subtitle": 0.0, "dubbing": 0.0},
            "by_component": {"stt": 0.0, "translation": 0.0, "tts": 0.0},
            "session_count": len(sessions),
            "total_duration_minutes": 0.0,
        }

        for session in sessions:
            breakdown["total_cost"] += session.estimated_total_cost
            breakdown["by_feature"][
                session.feature_type
            ] += session.estimated_total_cost
            breakdown["by_component"]["stt"] += session.estimated_stt_cost
            breakdown["by_component"][
                "translation"
            ] += session.estimated_translation_cost
            breakdown["by_component"]["tts"] += session.estimated_tts_cost
            breakdown["total_duration_minutes"] += session.duration_seconds / 60

        return breakdown

    @staticmethod
    async def check_provider_health(provider: str) -> Dict[str, Any]:
        """
        Check health of a voice provider

        Args:
            provider: Provider name (elevenlabs, whisper, google)

        Returns:
            Health check results
        """
        start_time = datetime.utcnow()
        is_healthy = False
        error_message = None
        latency_ms = 0.0

        try:
            if provider == "elevenlabs":
                if not settings.ELEVENLABS_API_KEY:
                    raise ValueError("ElevenLabs API key not configured")

                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(
                        "https://api.elevenlabs.io/v1/voices",
                        headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                    )
                    response.raise_for_status()
                    is_healthy = True

            elif provider == "whisper":
                if not settings.OPENAI_API_KEY:
                    raise ValueError("OpenAI API key not configured")
                is_healthy = True  # Basic config check

            elif provider == "google":
                if not settings.GOOGLE_API_KEY:
                    raise ValueError("Google API key not configured")
                is_healthy = True  # Basic config check

            else:
                raise ValueError(f"Unknown provider: {provider}")

        except Exception as e:
            error_message = str(e)
            logger.error(f"Provider health check failed for {provider}: {e}")

        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

        # Update health record
        health_record = await VoiceProviderHealth.find_one({"provider": provider})

        if health_record:
            health_record.is_healthy = is_healthy
            health_record.last_check_at = datetime.utcnow()
            if is_healthy:
                health_record.last_success_at = datetime.utcnow()
                health_record.consecutive_failures = 0
            else:
                health_record.last_failure_at = datetime.utcnow()
                health_record.consecutive_failures += 1
                health_record.last_error_message = error_message
            health_record.avg_latency_ms = latency_ms
            await health_record.save()
        else:
            health_record = VoiceProviderHealth(
                provider=provider,
                is_healthy=is_healthy,
                last_check_at=datetime.utcnow(),
                last_success_at=datetime.utcnow() if is_healthy else None,
                last_failure_at=None if is_healthy else datetime.utcnow(),
                consecutive_failures=0 if is_healthy else 1,
                last_error_message=error_message,
                avg_latency_ms=latency_ms,
            )
            await health_record.insert()

        return {
            "provider": provider,
            "is_healthy": is_healthy,
            "latency_ms": latency_ms,
            "error_message": error_message,
            "last_check_at": datetime.utcnow().isoformat(),
        }
