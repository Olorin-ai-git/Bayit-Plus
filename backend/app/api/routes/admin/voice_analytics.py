"""
Voice Analytics and Metrics Endpoints
Usage charts, cost breakdown, latency metrics
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.admin.auth import has_permission
from app.models.admin import Permission
from app.models.user import User
from app.services.voice_management_service import VoiceManagementService

router = APIRouter(
    prefix="/admin/voice-management/analytics",
    tags=["Admin - Voice Analytics"],
)
logger = logging.getLogger(__name__)


@router.get("/usage-charts")
async def get_usage_charts(
    period: str = "day",
    feature_type: Optional[str] = None,
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """
    Get time-series usage data for charts

    Args:
        period: day, week, or month
        feature_type: Optional filter by subtitle/dubbing
    """
    try:
        if period not in ["day", "week", "month"]:
            raise HTTPException(
                status_code=400,
                detail="Period must be one of: day, week, month",
            )

        data = await VoiceManagementService.get_usage_chart_data(
            period, feature_type
        )
        return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching usage charts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cost-breakdown")
async def get_cost_breakdown(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """
    Get cost breakdown by feature type and component

    Args:
        start_date: ISO format date string (default: 30 days ago)
        end_date: ISO format date string (default: now)
    """
    try:
        # Parse dates or use defaults
        if end_date:
            end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        else:
            end = datetime.utcnow()

        if start_date:
            start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        else:
            start = end - timedelta(days=30)

        breakdown = await VoiceManagementService.get_cost_breakdown(
            start, end
        )
        return {"success": True, "breakdown": breakdown}
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid date format: {e}"
        )
    except Exception as e:
        logger.error(f"Error fetching cost breakdown: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latency-metrics")
async def get_latency_metrics(
    period: str = "day",
    current_user: User = Depends(has_permission(Permission.VOICE_READ)),
):
    """
    Get latency metrics (percentiles, averages)

    Args:
        period: day, week, or month
    """
    try:
        if period not in ["day", "week", "month"]:
            raise HTTPException(
                status_code=400,
                detail="Period must be one of: day, week, month",
            )

        now = datetime.utcnow()
        if period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(days=7)
        else:  # month
            start_time = now - timedelta(days=30)

        sessions = await VoiceManagementService.get_realtime_sessions(
            limit=1000, status="completed"
        )

        # Filter by time period
        filtered = [
            s
            for s in sessions
            if datetime.fromisoformat(s["started_at"].replace("Z", "+00:00"))
            >= start_time
        ]

        # Calculate metrics
        if not filtered:
            return {
                "success": True,
                "metrics": {
                    "stt_latency": {},
                    "tts_latency": {},
                    "end_to_end_latency": {},
                    "sample_count": 0,
                },
            }

        stt_latencies = [s["stt_latency_ms"] for s in filtered]
        tts_latencies = [s["tts_first_audio_ms"] for s in filtered]
        e2e_latencies = [s["end_to_end_latency_ms"] for s in filtered]

        def calc_percentiles(values):
            if not values:
                return {}
            sorted_vals = sorted(values)
            return {
                "p50": sorted_vals[len(sorted_vals) // 2],
                "p95": sorted_vals[int(len(sorted_vals) * 0.95)],
                "p99": sorted_vals[int(len(sorted_vals) * 0.99)],
                "avg": sum(values) / len(values),
                "min": min(values),
                "max": max(values),
            }

        return {
            "success": True,
            "metrics": {
                "stt_latency": calc_percentiles(stt_latencies),
                "tts_latency": calc_percentiles(tts_latencies),
                "end_to_end_latency": calc_percentiles(e2e_latencies),
                "sample_count": len(filtered),
            },
        }
    except Exception as e:
        logger.error(f"Error calculating latency metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
