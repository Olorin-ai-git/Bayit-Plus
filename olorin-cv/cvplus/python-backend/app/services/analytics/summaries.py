"""
Analytics Summaries
Aggregate metrics and summary generation using MongoDB pipelines
"""

import logging
from datetime import datetime, timedelta
from typing import Dict

from app.models import AnalyticsEvent
from app.services.analytics.pipelines import build_user_summary_pipeline
from app.services.analytics.formatters import format_user_summary, format_empty_summary

logger = logging.getLogger(__name__)


async def get_user_summary(user_id: str, days: int = 30) -> Dict:
    """
    Get analytics summary for user using aggregation pipeline

    Args:
        user_id: User ID
        days: Number of days to include

    Returns:
        Analytics summary with views, downloads, visitors, and sources
    """
    logger.info(f"Getting analytics summary for user {user_id}", extra={
        "days": days,
    })

    start_date = datetime.utcnow() - timedelta(days=days)
    pipeline = build_user_summary_pipeline(user_id, start_date)
    results = await AnalyticsEvent.aggregate(pipeline).to_list(length=1)

    if not results:
        return format_empty_summary(days, start_date)

    return format_user_summary(results[0], days, start_date)
