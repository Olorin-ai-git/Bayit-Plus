"""
B2B Usage Analytics Router.

Endpoints for viewing usage statistics and analytics.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.security.b2b_auth import (
    B2BPartnerContext,
    get_b2b_partner_context,
)
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(prefix="/usage", tags=["B2B Usage Analytics"])


# ==================== Response Models ====================


class UsageSummary(BaseModel):
    """Usage summary for a time period."""

    partner_id: str
    org_id: str
    period_start: str
    period_end: str

    # Aggregate metrics
    total_requests: int
    total_tokens_consumed: int
    total_audio_seconds: float
    total_characters_processed: int
    estimated_cost_usd: float

    # By service category
    fraud_detection: dict
    content_ai: dict


class UsageBreakdown(BaseModel):
    """Detailed usage breakdown by capability."""

    capability: str
    request_count: int
    tokens_consumed: int
    audio_seconds: float
    characters_processed: int
    estimated_cost_usd: float
    daily_usage: list


# ==================== Endpoints ====================


@router.get("/summary")
async def get_usage_summary(
    start_date: Optional[str] = Query(
        default=None,
        description="Start date (ISO 8601). Defaults to start of current month.",
    ),
    end_date: Optional[str] = Query(
        default=None,
        description="End date (ISO 8601). Defaults to today.",
    ),
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    Get usage summary for the organization.

    Returns aggregated usage across all capabilities.
    """
    # Parse dates or use defaults
    now = datetime.now(timezone.utc)
    if start_date:
        try:
            period_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use ISO 8601.",
            )
    else:
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    if end_date:
        try:
            period_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use ISO 8601.",
            )
    else:
        period_end = now

    # Query usage records from database
    # For now, return a summary structure - actual implementation would query UsageRecord collection
    from app.persistence.mongodb import get_mongodb_client

    try:
        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["usage_records"]

        # Aggregate usage for this org in the period
        pipeline = [
            {
                "$match": {
                    "partner_id": context.org_id,
                    "period_start": {"$gte": period_start, "$lte": period_end},
                }
            },
            {
                "$group": {
                    "_id": "$capability",
                    "request_count": {"$sum": "$request_count"},
                    "tokens_consumed": {"$sum": "$tokens_consumed"},
                    "audio_seconds": {"$sum": "$audio_seconds_processed"},
                    "characters_processed": {"$sum": "$characters_processed"},
                    "estimated_cost": {"$sum": "$estimated_cost_usd"},
                }
            },
        ]

        usage_by_capability = {}
        async for doc in collection.aggregate(pipeline):
            usage_by_capability[doc["_id"]] = {
                "request_count": doc["request_count"],
                "tokens_consumed": doc["tokens_consumed"],
                "audio_seconds": doc["audio_seconds"],
                "characters_processed": doc["characters_processed"],
                "estimated_cost_usd": doc["estimated_cost"],
            }

        # Calculate totals
        total_requests = sum(u.get("request_count", 0) for u in usage_by_capability.values())
        total_tokens = sum(u.get("tokens_consumed", 0) for u in usage_by_capability.values())
        total_audio = sum(u.get("audio_seconds", 0) for u in usage_by_capability.values())
        total_chars = sum(u.get("characters_processed", 0) for u in usage_by_capability.values())
        total_cost = sum(u.get("estimated_cost_usd", 0) for u in usage_by_capability.values())

        # Group by service category
        fraud_capabilities = ["risk_assessment", "anomaly_detection", "investigation_api", "llm_analysis"]
        content_capabilities = ["realtime_dubbing", "semantic_search", "cultural_context", "recap_agent"]

        fraud_detection = {
            "request_count": 0,
            "tokens_consumed": 0,
            "estimated_cost_usd": 0.0,
            "capabilities": {},
        }
        content_ai = {
            "request_count": 0,
            "tokens_consumed": 0,
            "audio_seconds": 0.0,
            "characters_processed": 0,
            "estimated_cost_usd": 0.0,
            "capabilities": {},
        }

        for cap, usage in usage_by_capability.items():
            if cap in fraud_capabilities:
                fraud_detection["request_count"] += usage.get("request_count", 0)
                fraud_detection["tokens_consumed"] += usage.get("tokens_consumed", 0)
                fraud_detection["estimated_cost_usd"] += usage.get("estimated_cost_usd", 0)
                fraud_detection["capabilities"][cap] = usage
            elif cap in content_capabilities:
                content_ai["request_count"] += usage.get("request_count", 0)
                content_ai["tokens_consumed"] += usage.get("tokens_consumed", 0)
                content_ai["audio_seconds"] += usage.get("audio_seconds", 0)
                content_ai["characters_processed"] += usage.get("characters_processed", 0)
                content_ai["estimated_cost_usd"] += usage.get("estimated_cost_usd", 0)
                content_ai["capabilities"][cap] = usage

        return {
            "summary": {
                "org_id": context.org_id,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "totals": {
                    "request_count": total_requests,
                    "tokens_consumed": total_tokens,
                    "audio_seconds": total_audio,
                    "characters_processed": total_chars,
                    "estimated_cost_usd": round(total_cost, 4),
                },
                "fraud_detection": fraud_detection,
                "content_ai": content_ai,
            }
        }

    except Exception as e:
        logger.error(f"Failed to get usage summary: {e}")
        # Return empty summary on error
        return {
            "summary": {
                "org_id": context.org_id,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "totals": {
                    "request_count": 0,
                    "tokens_consumed": 0,
                    "audio_seconds": 0.0,
                    "characters_processed": 0,
                    "estimated_cost_usd": 0.0,
                },
                "fraud_detection": {},
                "content_ai": {},
            }
        }


@router.get("/breakdown")
async def get_usage_breakdown(
    capability: Optional[str] = Query(
        default=None,
        description="Filter by specific capability",
    ),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    granularity: str = Query(
        default="daily",
        pattern="^(hourly|daily|monthly)$",
        description="Time granularity for breakdown",
    ),
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    Get detailed usage breakdown by capability.

    Returns time-series data for usage visualization.
    """
    # Parse dates
    now = datetime.now(timezone.utc)
    if start_date:
        try:
            period_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format",
            )
    else:
        period_start = now - timedelta(days=30)

    if end_date:
        try:
            period_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format",
            )
    else:
        period_end = now

    from app.persistence.mongodb import get_mongodb_client

    try:
        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["usage_records"]

        # Build query
        query = {
            "partner_id": context.org_id,
            "period_start": {"$gte": period_start, "$lte": period_end},
            "granularity": granularity,
        }
        if capability:
            query["capability"] = capability

        # Get records
        breakdown = []
        async for doc in collection.find(query).sort("period_start", 1):
            breakdown.append({
                "capability": doc.get("capability"),
                "period_start": doc.get("period_start").isoformat() if doc.get("period_start") else None,
                "period_end": doc.get("period_end").isoformat() if doc.get("period_end") else None,
                "request_count": doc.get("request_count", 0),
                "tokens_consumed": doc.get("tokens_consumed", 0),
                "audio_seconds": doc.get("audio_seconds_processed", 0),
                "characters_processed": doc.get("characters_processed", 0),
                "estimated_cost_usd": doc.get("estimated_cost_usd", 0),
            })

        return {
            "breakdown": breakdown,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "granularity": granularity,
            "total_records": len(breakdown),
        }

    except Exception as e:
        logger.error(f"Failed to get usage breakdown: {e}")
        return {
            "breakdown": [],
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "granularity": granularity,
            "total_records": 0,
        }


@router.get("/export")
async def export_usage(
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    context: B2BPartnerContext = Depends(get_b2b_partner_context),
) -> dict:
    """
    Export usage data in CSV or JSON format.

    Returns a download URL or direct data.
    """
    # Parse dates
    now = datetime.now(timezone.utc)
    if start_date:
        try:
            period_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format",
            )
    else:
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    if end_date:
        try:
            period_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format",
            )
    else:
        period_end = now

    from app.persistence.mongodb import get_mongodb_client

    try:
        client = await get_mongodb_client()
        db = client.get_default_database()
        collection = db["usage_records"]

        query = {
            "partner_id": context.org_id,
            "period_start": {"$gte": period_start, "$lte": period_end},
        }

        records = []
        async for doc in collection.find(query).sort("period_start", 1):
            records.append({
                "date": doc.get("period_start").isoformat() if doc.get("period_start") else "",
                "capability": doc.get("capability", ""),
                "request_count": doc.get("request_count", 0),
                "tokens_consumed": doc.get("tokens_consumed", 0),
                "audio_seconds": doc.get("audio_seconds_processed", 0),
                "characters_processed": doc.get("characters_processed", 0),
                "estimated_cost_usd": doc.get("estimated_cost_usd", 0),
                "granularity": doc.get("granularity", ""),
            })

        if format == "json":
            return {
                "format": "json",
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "records": records,
            }
        else:
            # Convert to CSV format
            if not records:
                csv_content = "date,capability,request_count,tokens_consumed,audio_seconds,characters_processed,estimated_cost_usd,granularity\n"
            else:
                headers = ",".join(records[0].keys())
                rows = [",".join(str(v) for v in r.values()) for r in records]
                csv_content = headers + "\n" + "\n".join(rows)

            return {
                "format": "csv",
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "csv_content": csv_content,
                "record_count": len(records),
            }

    except Exception as e:
        logger.error(f"Failed to export usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export usage data",
        )
