"""
Dubbing Session Management

Functions for managing dubbing session records.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.models.integration_partner import DubbingSession
from app.services.olorin.metering.costs import calculate_session_cost
from app.services.olorin.metering.usage import record_dubbing_usage

logger = logging.getLogger(__name__)


async def create_dubbing_session(
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

    session.estimated_cost_usd = calculate_session_cost(
        session.audio_seconds_processed,
        session.characters_translated,
    )

    await session.save()

    # Record to usage
    await record_dubbing_usage(
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


async def get_dubbing_session(session_id: str) -> Optional[DubbingSession]:
    """Get a dubbing session by ID."""
    return await DubbingSession.find_one(
        DubbingSession.session_id == session_id
    )


async def get_active_sessions_count(partner_id: str) -> int:
    """Get count of active dubbing sessions for a partner."""
    return await DubbingSession.find(
        DubbingSession.partner_id == partner_id,
        DubbingSession.status == "active",
    ).count()
