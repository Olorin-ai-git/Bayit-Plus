"""
Usage Recording

Functions for recording usage across capabilities.
"""

import logging
from datetime import datetime, timedelta, timezone

from app.models.integration_partner import UsageRecord
from app.services.olorin.metering.costs import (calculate_dubbing_cost,
                                                calculate_generic_cost,
                                                calculate_llm_cost,
                                                calculate_search_cost)

logger = logging.getLogger(__name__)


def _get_hourly_period() -> tuple[datetime, datetime]:
    """Get current hourly period boundaries."""
    now = datetime.now(timezone.utc)
    period_start = now.replace(minute=0, second=0, microsecond=0)
    period_end = period_start + timedelta(hours=1)
    return period_start, period_end


async def _find_or_create_record(
    partner_id: str,
    capability: str,
    period_start: datetime,
    period_end: datetime,
) -> tuple[UsageRecord, bool]:
    """Find existing hourly record or create a new one.

    Returns:
        Tuple of (record, is_new).
    """
    record = await UsageRecord.find_one(
        {
            "partner_id": partner_id,
            "capability": capability,
            "period_start": period_start,
            "granularity": "hourly",
        }
    )
    if record:
        return record, False
    return UsageRecord(
        partner_id=partner_id,
        capability=capability,
        request_count=0,
        tokens_consumed=0,
        audio_seconds_processed=0.0,
        characters_processed=0,
        estimated_cost_usd=0.0,
        period_start=period_start,
        period_end=period_end,
        granularity="hourly",
    ), True


async def record_dubbing_usage(
    partner_id: str,
    session_id: str,
    audio_seconds: float,
    characters_translated: int,
    characters_synthesized: int,
) -> UsageRecord:
    """Record usage for a dubbing session."""
    total_cost = calculate_dubbing_cost(
        audio_seconds, characters_translated, characters_synthesized
    )
    period_start, period_end = _get_hourly_period()
    record, _ = await _find_or_create_record(
        partner_id, "realtime_dubbing", period_start, period_end
    )
    record.request_count += 1
    record.audio_seconds_processed += audio_seconds
    record.characters_processed += characters_translated + characters_synthesized
    record.estimated_cost_usd += total_cost
    await record.save()
    logger.debug(
        "Recorded dubbing usage for %s: %.1fs, $%.4f",
        partner_id,
        audio_seconds,
        total_cost,
    )
    return record


async def record_search_usage(
    partner_id: str,
    tokens_used: int,
    results_returned: int,
) -> UsageRecord:
    """Record usage for a semantic search request."""
    embedding_cost = calculate_search_cost(tokens_used)
    period_start, period_end = _get_hourly_period()
    record, _ = await _find_or_create_record(
        partner_id, "semantic_search", period_start, period_end
    )
    record.request_count += 1
    record.tokens_consumed += tokens_used
    record.estimated_cost_usd += embedding_cost
    await record.save()
    return record


async def record_context_usage(
    partner_id: str,
    tokens_used: int,
    references_found: int,
) -> UsageRecord:
    """Record usage for cultural context requests."""
    llm_cost = calculate_llm_cost(tokens_used)
    period_start, period_end = _get_hourly_period()
    record, _ = await _find_or_create_record(
        partner_id, "cultural_context", period_start, period_end
    )
    record.request_count += 1
    record.tokens_consumed += tokens_used
    record.estimated_cost_usd += llm_cost
    await record.save()
    return record


async def record_recap_usage(
    partner_id: str,
    tokens_used: int,
    transcript_seconds: float,
) -> UsageRecord:
    """Record usage for recap agent requests."""
    llm_cost = calculate_llm_cost(tokens_used)
    period_start, period_end = _get_hourly_period()
    record, _ = await _find_or_create_record(
        partner_id, "recap_agent", period_start, period_end
    )
    record.request_count += 1
    record.tokens_consumed += tokens_used
    record.audio_seconds_processed += transcript_seconds
    record.estimated_cost_usd += llm_cost
    await record.save()
    return record


async def record_generic_usage(
    partner_id: str,
    capability: str,
    metadata: dict,
) -> UsageRecord:
    """Record usage for any capability.

    Args:
        partner_id: Partner identifier.
        capability: Capability name (e.g. pause_ask, subtitles).
        metadata: Request metadata; may contain tokens_used or
            audio_seconds for additional counter updates.

    Returns:
        Updated or created usage record.
    """
    cost = calculate_generic_cost(capability)
    period_start, period_end = _get_hourly_period()
    record, _ = await _find_or_create_record(
        partner_id, capability, period_start, period_end
    )
    record.request_count += 1
    tokens = metadata.get("tokens_used")
    if tokens is not None:
        record.tokens_consumed += int(tokens)
    audio = metadata.get("audio_seconds")
    if audio is not None:
        record.audio_seconds_processed += float(audio)
    record.estimated_cost_usd += cost
    await record.save()
    logger.debug(
        "Recorded generic usage for %s/%s: $%.4f",
        partner_id,
        capability,
        cost,
    )
    return record
