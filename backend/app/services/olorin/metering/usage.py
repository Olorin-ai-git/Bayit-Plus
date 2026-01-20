"""
Usage Recording

Functions for recording usage across capabilities.
"""

import logging
from datetime import datetime, timezone, timedelta

from app.models.integration_partner import UsageRecord
from app.services.olorin.metering.costs import (
    calculate_dubbing_cost,
    calculate_search_cost,
    calculate_llm_cost,
)

logger = logging.getLogger(__name__)


def _get_hourly_period() -> tuple[datetime, datetime]:
    """Get current hourly period boundaries."""
    now = datetime.now(timezone.utc)
    period_start = now.replace(minute=0, second=0, microsecond=0)
    period_end = period_start + timedelta(hours=1)
    return period_start, period_end


async def record_dubbing_usage(
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
        characters_synthesized: Characters synthesized

    Returns:
        Updated or created usage record
    """
    total_cost = calculate_dubbing_cost(audio_seconds, characters_translated, characters_synthesized)
    period_start, period_end = _get_hourly_period()

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
    logger.debug(f"Recorded dubbing usage for {partner_id}: {audio_seconds:.1f}s, ${total_cost:.4f}")
    return record


async def record_search_usage(
    partner_id: str,
    tokens_used: int,
    results_returned: int,
) -> UsageRecord:
    """Record usage for a semantic search request."""
    embedding_cost = calculate_search_cost(tokens_used)
    period_start, period_end = _get_hourly_period()

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
    partner_id: str,
    tokens_used: int,
    references_found: int,
) -> UsageRecord:
    """Record usage for cultural context requests."""
    llm_cost = calculate_llm_cost(tokens_used)
    period_start, period_end = _get_hourly_period()

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
    partner_id: str,
    tokens_used: int,
    transcript_seconds: float,
) -> UsageRecord:
    """Record usage for recap agent requests."""
    llm_cost = calculate_llm_cost(tokens_used)
    period_start, period_end = _get_hourly_period()

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
