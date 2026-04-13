"""Playground analytics admin read endpoints (summary + funnel)."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends

from app.core.security import get_current_admin_user
from app.models.playground_event import PlaygroundEvent
from app.models.user import User
from app.schemas.demo_analytics import (
    DailyTrendPoint,
    FunnelResponse,
    FunnelStage,
    SummaryResponse,
    TopCta,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo/events", tags=["demo", "analytics"])


def _period_to_days(period: str) -> int:
    return {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)


@router.get("/summary", response_model=SummaryResponse)
async def get_summary(
    period: Literal["7d", "30d", "90d"] = "30d",
    _admin: User = Depends(get_current_admin_user),
) -> SummaryResponse:
    """Aggregated analytics for the admin dashboard."""
    days = _period_to_days(period)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    pipeline_sessions = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {"_id": "$session_id", "track": {"$first": "$track"}}},
        {"$group": {"_id": "$track", "count": {"$sum": 1}}},
    ]
    track_counts = await PlaygroundEvent.get_motor_collection().aggregate(pipeline_sessions).to_list(length=None)
    sessions_by_track = {doc["_id"]: doc["count"] for doc in track_counts}
    total_sessions = sum(sessions_by_track.values())

    pipeline_events = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {"_id": "$event_name", "count": {"$sum": 1}}},
    ]
    event_counts = await PlaygroundEvent.get_motor_collection().aggregate(pipeline_events).to_list(length=None)
    events_by_type = {doc["_id"]: doc["count"] for doc in event_counts}

    pipeline_stops = [
        {"$match": {
            "created_at": {"$gte": since},
            "event_name": {"$in": ["demo_stop_viewed", "demo_stop_completed"]},
        }},
        {"$group": {
            "_id": {"stop": "$properties.stop_id", "event": "$event_name"},
            "count": {"$sum": 1},
        }},
    ]
    stop_docs = await PlaygroundEvent.get_motor_collection().aggregate(pipeline_stops).to_list(length=None)
    viewed: dict[str, int] = {}
    completed: dict[str, int] = {}
    for doc in stop_docs:
        stop = doc["_id"]["stop"]
        if doc["_id"]["event"] == "demo_stop_viewed":
            viewed[stop] = doc["count"]
        else:
            completed[stop] = doc["count"]
    stops_rate = {
        s: round(completed.get(s, 0) / viewed[s], 2)
        for s in viewed if viewed[s] > 0
    }

    pipeline_daily = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "event": "$event_name",
            },
            "sessions": {"$addToSet": "$session_id"},
        }},
    ]
    daily_raw = await PlaygroundEvent.get_motor_collection().aggregate(pipeline_daily).to_list(length=None)
    daily_map: dict[str, dict] = {}
    for doc in daily_raw:
        d = doc["_id"]["date"]
        if d not in daily_map:
            daily_map[d] = {"sessions": set(), "completions": 0}
        daily_map[d]["sessions"] |= set(doc["sessions"])
        if doc["_id"]["event"] == "tour_completed":
            daily_map[d]["completions"] += len(doc["sessions"])
    daily_trend = sorted([
        DailyTrendPoint(
            date=d, sessions=len(v["sessions"]), completions=v["completions"],
        )
        for d, v in daily_map.items()
    ], key=lambda p: p.date)

    pipeline_ctas = [
        {"$match": {"created_at": {"$gte": since}, "event_name": "cta_clicked"}},
        {"$group": {
            "_id": {"type": "$properties.cta_type", "location": "$properties.location"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    cta_docs = await PlaygroundEvent.get_motor_collection().aggregate(pipeline_ctas).to_list(length=None)
    top_ctas = [
        TopCta(
            type=doc["_id"]["type"],
            location=doc["_id"]["location"],
            count=doc["count"],
        )
        for doc in cta_docs
    ]

    return SummaryResponse(
        period=period,
        total_sessions=total_sessions,
        unique_sessions_by_track=sessions_by_track,
        events_by_type=events_by_type,
        stops_completion_rate=stops_rate,
        daily_trend=daily_trend,
        top_ctas=top_ctas,
    )


@router.get("/funnel", response_model=FunnelResponse)
async def get_funnel(
    period: Literal["7d", "30d", "90d"] = "30d",
    _admin: User = Depends(get_current_admin_user),
) -> FunnelResponse:
    """Conversion funnel stages for the admin dashboard."""
    days = _period_to_days(period)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    pipeline = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {
            "_id": "$session_id",
            "events": {"$addToSet": "$event_name"},
            "completed_stops": {
                "$addToSet": {
                    "$cond": [
                        {"$eq": ["$event_name", "demo_stop_completed"]},
                        "$properties.stop_id",
                        "$$REMOVE",
                    ]
                }
            },
        }},
    ]
    sessions = await PlaygroundEvent.get_motor_collection().aggregate(pipeline).to_list(length=None)
    total = len(sessions)
    if total == 0:
        return FunnelResponse(period=period, stages=[])

    started = sum(1 for s in sessions if "tour_started" in s["events"])
    three_plus = sum(
        1 for s in sessions if len([x for x in s["completed_stops"] if x]) >= 3
    )
    completed = sum(1 for s in sessions if "tour_completed" in s["events"])
    cta = sum(1 for s in sessions if "cta_clicked" in s["events"])

    def pct(n: int) -> float:
        return round(n / total * 100, 1) if total else 0

    return FunnelResponse(
        period=period,
        stages=[
            FunnelStage(stage="Page Views", count=total, percentage=100.0),
            FunnelStage(stage="Tour Started", count=started, percentage=pct(started)),
            FunnelStage(
                stage="3+ Stops Completed", count=three_plus, percentage=pct(three_plus),
            ),
            FunnelStage(stage="Tour Completed", count=completed, percentage=pct(completed)),
            FunnelStage(stage="CTA Clicked", count=cta, percentage=pct(cta)),
        ],
    )
