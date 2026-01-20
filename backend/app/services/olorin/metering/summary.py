"""
Usage Summary and Limits

Functions for getting usage summaries and checking limits.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.models.integration_partner import IntegrationPartner, UsageRecord

logger = logging.getLogger(__name__)


async def get_usage_summary(
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

    query = {
        "partner_id": partner_id,
        "period_start": {"$gte": start_date, "$lt": end_date},
    }
    if capability:
        query["capability"] = capability

    records = await UsageRecord.find(query).to_list()

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
    if not partner.has_capability(capability):
        return False, f"Capability '{capability}' not enabled for this partner"

    if partner.monthly_usage_limit_usd:
        summary = await get_usage_summary(partner.partner_id)
        if summary["totals"]["estimated_cost_usd"] >= partner.monthly_usage_limit_usd:
            return False, "Monthly usage limit exceeded"

    config = partner.get_capability_config(capability)
    if not config:
        return False, f"No configuration for capability '{capability}'"

    rate_limits = config.rate_limits

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
