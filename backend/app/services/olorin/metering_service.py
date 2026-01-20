"""
Metering Service for Olorin.ai Platform

Tracks usage for billing and analytics across all capabilities.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.models.integration_partner import (
    IntegrationPartner,
    UsageRecord,
    DubbingSession,
    WebhookDelivery,
)

logger = logging.getLogger(__name__)


# Cost estimates per unit (USD)
COST_PER_AUDIO_SECOND_STT = 0.00004  # ElevenLabs STT ~$0.04/1000 seconds
COST_PER_AUDIO_SECOND_TTS = 0.00024  # ElevenLabs TTS ~$0.24/1000 seconds
COST_PER_1K_TRANSLATION_CHARS = 0.00002  # Google Translate ~$20/1M chars
COST_PER_1K_TOKENS_LLM = 0.003  # Claude Sonnet ~$3/1M input tokens
COST_PER_1K_EMBEDDING_TOKENS = 0.00002  # OpenAI embeddings ~$0.02/1M tokens


class MeteringService:
    """Service for tracking usage and calculating costs."""

    async def record_dubbing_usage(
        self,
        partner_id: str,
        session_id: str,
        audio_seconds: float,
        characters_translated: int,
        characters_synthesized: int,
    ) -> UsageRecord:
        """
        Record usage for a dubbing session.

        Args:
            partner_id: Partner identifier
            session_id: Session identifier
            audio_seconds: Seconds of audio processed
            characters_translated: Characters translated
            characters_synthesized: Characters synthesized to audio

        Returns:
            Updated or created usage record
        """
        # Calculate costs
        stt_cost = audio_seconds * COST_PER_AUDIO_SECOND_STT
        translation_cost = (characters_translated / 1000) * COST_PER_1K_TRANSLATION_CHARS
        tts_cost = (characters_synthesized / 1000) * COST_PER_AUDIO_SECOND_TTS * 10  # Approx chars to seconds
        total_cost = stt_cost + translation_cost + tts_cost

        # Get or create hourly usage record
        now = datetime.now(timezone.utc)
        period_start = now.replace(minute=0, second=0, microsecond=0)
        period_end = period_start + timedelta(hours=1)

        record = await UsageRecord.find_one(
            UsageRecord.partner_id == partner_id,
            UsageRecord.capability == "realtime_dubbing",
            UsageRecord.period_start == period_start,
            UsageRecord.granularity == "hourly",
        )

        if record:
            record.request_count += 1
            record.audio_seconds_processed += audio_seconds
            record.characters_processed += characters_translated + characters_synthesized
            record.estimated_cost_usd += total_cost
        else:
            record = UsageRecord(
                partner_id=partner_id,
                capability="realtime_dubbing",
                request_count=1,
                audio_seconds_processed=audio_seconds,
                characters_processed=characters_translated + characters_synthesized,
                estimated_cost_usd=total_cost,
                period_start=period_start,
                period_end=period_end,
                granularity="hourly",
            )

        await record.save()
        logger.debug(
            f"Recorded dubbing usage for {partner_id}: "
            f"{audio_seconds:.1f}s audio, ${total_cost:.4f}"
        )

        return record

    async def record_search_usage(
        self,
        partner_id: str,
        tokens_used: int,
        results_returned: int,
    ) -> UsageRecord:
        """
        Record usage for a semantic search request.

        Args:
            partner_id: Partner identifier
            tokens_used: Embedding tokens used
            results_returned: Number of results returned

        Returns:
            Updated or created usage record
        """
        # Calculate cost
        embedding_cost = (tokens_used / 1000) * COST_PER_1K_EMBEDDING_TOKENS

        # Get or create hourly usage record
        now = datetime.now(timezone.utc)
        period_start = now.replace(minute=0, second=0, microsecond=0)
        period_end = period_start + timedelta(hours=1)

        record = await UsageRecord.find_one(
            UsageRecord.partner_id == partner_id,
            UsageRecord.capability == "semantic_search",
            UsageRecord.period_start == period_start,
            UsageRecord.granularity == "hourly",
        )

        if record:
            record.request_count += 1
            record.tokens_consumed += tokens_used
            record.estimated_cost_usd += embedding_cost
        else:
            record = UsageRecord(
                partner_id=partner_id,
                capability="semantic_search",
                request_count=1,
                tokens_consumed=tokens_used,
                estimated_cost_usd=embedding_cost,
                period_start=period_start,
                period_end=period_end,
                granularity="hourly",
            )

        await record.save()
        return record

    async def record_context_usage(
        self,
        partner_id: str,
        tokens_used: int,
        references_found: int,
    ) -> UsageRecord:
        """
        Record usage for cultural context requests.

        Args:
            partner_id: Partner identifier
            tokens_used: LLM tokens used
            references_found: Number of references detected

        Returns:
            Updated or created usage record
        """
        # Calculate cost
        llm_cost = (tokens_used / 1000) * COST_PER_1K_TOKENS_LLM

        # Get or create hourly usage record
        now = datetime.now(timezone.utc)
        period_start = now.replace(minute=0, second=0, microsecond=0)
        period_end = period_start + timedelta(hours=1)

        record = await UsageRecord.find_one(
            UsageRecord.partner_id == partner_id,
            UsageRecord.capability == "cultural_context",
            UsageRecord.period_start == period_start,
            UsageRecord.granularity == "hourly",
        )

        if record:
            record.request_count += 1
            record.tokens_consumed += tokens_used
            record.estimated_cost_usd += llm_cost
        else:
            record = UsageRecord(
                partner_id=partner_id,
                capability="cultural_context",
                request_count=1,
                tokens_consumed=tokens_used,
                estimated_cost_usd=llm_cost,
                period_start=period_start,
                period_end=period_end,
                granularity="hourly",
            )

        await record.save()
        return record

    async def record_recap_usage(
        self,
        partner_id: str,
        tokens_used: int,
        transcript_seconds: float,
    ) -> UsageRecord:
        """
        Record usage for recap agent requests.

        Args:
            partner_id: Partner identifier
            tokens_used: LLM tokens used for summarization
            transcript_seconds: Seconds of transcript processed

        Returns:
            Updated or created usage record
        """
        # Calculate cost
        llm_cost = (tokens_used / 1000) * COST_PER_1K_TOKENS_LLM

        # Get or create hourly usage record
        now = datetime.now(timezone.utc)
        period_start = now.replace(minute=0, second=0, microsecond=0)
        period_end = period_start + timedelta(hours=1)

        record = await UsageRecord.find_one(
            UsageRecord.partner_id == partner_id,
            UsageRecord.capability == "recap_agent",
            UsageRecord.period_start == period_start,
            UsageRecord.granularity == "hourly",
        )

        if record:
            record.request_count += 1
            record.tokens_consumed += tokens_used
            record.audio_seconds_processed += transcript_seconds
            record.estimated_cost_usd += llm_cost
        else:
            record = UsageRecord(
                partner_id=partner_id,
                capability="recap_agent",
                request_count=1,
                tokens_consumed=tokens_used,
                audio_seconds_processed=transcript_seconds,
                estimated_cost_usd=llm_cost,
                period_start=period_start,
                period_end=period_end,
                granularity="hourly",
            )

        await record.save()
        return record

    async def get_usage_summary(
        self,
        partner_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        capability: Optional[str] = None,
    ) -> dict:
        """
        Get usage summary for a partner.

        Args:
            partner_id: Partner identifier
            start_date: Start of period (default: start of current month)
            end_date: End of period (default: now)
            capability: Filter by capability type

        Returns:
            Usage summary with totals by capability
        """
        now = datetime.now(timezone.utc)

        if start_date is None:
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if end_date is None:
            end_date = now

        # Build query
        query = {
            "partner_id": partner_id,
            "period_start": {"$gte": start_date, "$lt": end_date},
        }
        if capability:
            query["capability"] = capability

        # Aggregate usage
        records = await UsageRecord.find(query).to_list()

        # Group by capability
        by_capability: dict = {}
        totals = {
            "request_count": 0,
            "audio_seconds_processed": 0.0,
            "tokens_consumed": 0,
            "characters_processed": 0,
            "estimated_cost_usd": 0.0,
        }

        for record in records:
            cap = record.capability
            if cap not in by_capability:
                by_capability[cap] = {
                    "request_count": 0,
                    "audio_seconds_processed": 0.0,
                    "tokens_consumed": 0,
                    "characters_processed": 0,
                    "estimated_cost_usd": 0.0,
                }

            by_capability[cap]["request_count"] += record.request_count
            by_capability[cap]["audio_seconds_processed"] += record.audio_seconds_processed
            by_capability[cap]["tokens_consumed"] += record.tokens_consumed
            by_capability[cap]["characters_processed"] += record.characters_processed
            by_capability[cap]["estimated_cost_usd"] += record.estimated_cost_usd

            totals["request_count"] += record.request_count
            totals["audio_seconds_processed"] += record.audio_seconds_processed
            totals["tokens_consumed"] += record.tokens_consumed
            totals["characters_processed"] += record.characters_processed
            totals["estimated_cost_usd"] += record.estimated_cost_usd

        return {
            "partner_id": partner_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            "by_capability": by_capability,
            "totals": totals,
        }

    async def check_usage_limit(
        self,
        partner: IntegrationPartner,
        capability: str,
    ) -> tuple[bool, Optional[str]]:
        """
        Check if partner is within usage limits.

        Args:
            partner: Partner document
            capability: Capability to check

        Returns:
            Tuple of (is_within_limits, error_message)
        """
        # Check if capability is enabled
        if not partner.has_capability(capability):
            return False, f"Capability '{capability}' not enabled for this partner"

        # Check monthly spending limit
        if partner.monthly_usage_limit_usd:
            summary = await self.get_usage_summary(partner.partner_id)
            if summary["totals"]["estimated_cost_usd"] >= partner.monthly_usage_limit_usd:
                return False, "Monthly usage limit exceeded"

        # Check rate limits
        config = partner.get_capability_config(capability)
        if not config:
            return False, f"No configuration for capability '{capability}'"

        rate_limits = config.rate_limits

        # Check requests per minute
        now = datetime.now(timezone.utc)
        minute_ago = now - timedelta(minutes=1)

        recent_records = await UsageRecord.find(
            UsageRecord.partner_id == partner.partner_id,
            UsageRecord.capability == capability,
            UsageRecord.period_start >= minute_ago,
        ).to_list()

        recent_requests = sum(r.request_count for r in recent_records)
        if recent_requests >= rate_limits.requests_per_minute:
            return False, "Rate limit exceeded (requests per minute)"

        return True, None

    async def create_dubbing_session(
        self,
        partner_id: str,
        session_id: str,
        source_language: str,
        target_language: str,
        voice_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        client_user_agent: Optional[str] = None,
    ) -> DubbingSession:
        """Create a new dubbing session record."""
        session = DubbingSession(
            session_id=session_id,
            partner_id=partner_id,
            source_language=source_language,
            target_language=target_language,
            voice_id=voice_id,
            client_ip=client_ip,
            client_user_agent=client_user_agent,
        )
        await session.insert()
        logger.info(f"Created dubbing session {session_id} for partner {partner_id}")
        return session

    async def update_dubbing_session(
        self,
        session_id: str,
        **updates,
    ) -> Optional[DubbingSession]:
        """Update a dubbing session."""
        session = await DubbingSession.find_one(
            DubbingSession.session_id == session_id
        )
        if not session:
            return None

        for key, value in updates.items():
            if hasattr(session, key):
                setattr(session, key, value)

        session.last_activity_at = datetime.now(timezone.utc)
        await session.save()
        return session

    async def end_dubbing_session(
        self,
        session_id: str,
        status: str = "ended",
        error_message: Optional[str] = None,
    ) -> Optional[DubbingSession]:
        """End a dubbing session and record final metrics."""
        session = await DubbingSession.find_one(
            DubbingSession.session_id == session_id
        )
        if not session:
            return None

        session.status = status
        session.ended_at = datetime.now(timezone.utc)
        session.last_activity_at = datetime.now(timezone.utc)

        if error_message:
            session.error_message = error_message
            session.error_count += 1

        # Calculate estimated cost
        session.estimated_cost_usd = (
            session.audio_seconds_processed * COST_PER_AUDIO_SECOND_STT
            + session.audio_seconds_processed * COST_PER_AUDIO_SECOND_TTS
            + (session.characters_translated / 1000) * COST_PER_1K_TRANSLATION_CHARS
        )

        await session.save()

        # Record to usage
        await self.record_dubbing_usage(
            partner_id=session.partner_id,
            session_id=session_id,
            audio_seconds=session.audio_seconds_processed,
            characters_translated=session.characters_translated,
            characters_synthesized=session.characters_synthesized,
        )

        logger.info(
            f"Ended dubbing session {session_id}: "
            f"{session.audio_seconds_processed:.1f}s, ${session.estimated_cost_usd:.4f}"
        )

        return session

    async def get_dubbing_session(self, session_id: str) -> Optional[DubbingSession]:
        """Get a dubbing session by ID."""
        return await DubbingSession.find_one(
            DubbingSession.session_id == session_id
        )

    async def get_active_sessions_count(self, partner_id: str) -> int:
        """Get count of active dubbing sessions for a partner."""
        return await DubbingSession.find(
            DubbingSession.partner_id == partner_id,
            DubbingSession.status == "active",
        ).count()


# Singleton instance
metering_service = MeteringService()
