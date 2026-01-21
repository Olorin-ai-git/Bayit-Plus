"""
Metering Service

Main service class that coordinates metering operations.
"""

from datetime import datetime
from typing import Optional

from app.models.integration_partner import (DubbingSession, IntegrationPartner,
                                            UsageRecord)
from app.services.olorin.metering import sessions, summary, usage


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
        """Record usage for a dubbing session."""
        return await usage.record_dubbing_usage(
            partner_id,
            session_id,
            audio_seconds,
            characters_translated,
            characters_synthesized,
        )

    async def record_search_usage(
        self,
        partner_id: str,
        tokens_used: int,
        results_returned: int,
    ) -> UsageRecord:
        """Record usage for a semantic search request."""
        return await usage.record_search_usage(
            partner_id, tokens_used, results_returned
        )

    async def record_context_usage(
        self,
        partner_id: str,
        tokens_used: int,
        references_found: int,
    ) -> UsageRecord:
        """Record usage for cultural context requests."""
        return await usage.record_context_usage(
            partner_id, tokens_used, references_found
        )

    async def record_recap_usage(
        self,
        partner_id: str,
        tokens_used: int,
        transcript_seconds: float,
    ) -> UsageRecord:
        """Record usage for recap agent requests."""
        return await usage.record_recap_usage(
            partner_id, tokens_used, transcript_seconds
        )

    async def get_usage_summary(
        self,
        partner_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        capability: Optional[str] = None,
    ) -> dict:
        """Get usage summary for a partner."""
        return await summary.get_usage_summary(
            partner_id, start_date, end_date, capability
        )

    async def check_usage_limit(
        self,
        partner: IntegrationPartner,
        capability: str,
    ) -> tuple[bool, Optional[str]]:
        """Check if partner is within usage limits."""
        return await summary.check_usage_limit(partner, capability)

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
        return await sessions.create_dubbing_session(
            partner_id,
            session_id,
            source_language,
            target_language,
            voice_id,
            client_ip,
            client_user_agent,
        )

    async def update_dubbing_session(
        self,
        session_id: str,
        **updates,
    ) -> Optional[DubbingSession]:
        """Update a dubbing session."""
        return await sessions.update_dubbing_session(session_id, **updates)

    async def end_dubbing_session(
        self,
        session_id: str,
        status: str = "ended",
        error_message: Optional[str] = None,
    ) -> Optional[DubbingSession]:
        """End a dubbing session and record final metrics."""
        return await sessions.end_dubbing_session(session_id, status, error_message)

    async def get_dubbing_session(self, session_id: str) -> Optional[DubbingSession]:
        """Get a dubbing session by ID."""
        return await sessions.get_dubbing_session(session_id)

    async def get_active_sessions_count(self, partner_id: str) -> int:
        """Get count of active dubbing sessions for a partner."""
        return await sessions.get_active_sessions_count(partner_id)


# Singleton instance
metering_service = MeteringService()
