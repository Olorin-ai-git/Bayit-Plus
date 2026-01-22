"""
CV Metrics
Analytics for specific CVs using MongoDB pipelines
"""

import logging
from typing import Dict

from app.models import AnalyticsEvent, CV
from app.services.analytics.pipelines import build_cv_metrics_pipeline
from app.services.analytics.formatters import format_cv_metrics

logger = logging.getLogger(__name__)


async def get_cv_metrics(cv_id: str, user_id: str) -> Dict:
    """
    Get metrics for specific CV using aggregation pipeline

    Args:
        cv_id: CV ID
        user_id: User ID (for ownership verification)

    Returns:
        CV metrics with views, downloads, and analysis scores
    """
    logger.info(f"Getting CV metrics for {cv_id}")

    cv = await CV.get(cv_id)
    if not cv or cv.user_id != user_id:
        raise PermissionError("CV not found or access denied")

    pipeline = build_cv_metrics_pipeline(cv_id)
    results = await AnalyticsEvent.aggregate(pipeline).to_list(length=100)

    from app.models import CVAnalysis
    analysis = None
    if cv.analysis_id:
        analysis = await CVAnalysis.get(cv.analysis_id)

    return format_cv_metrics(results, cv_id, cv, analysis)


async def clear_user_analytics(user_id: str):
    """Clear all analytics data for user (admin only)"""

    logger.warning(f"Clearing analytics data for user {user_id}")

    await AnalyticsEvent.find(
        AnalyticsEvent.user_id == user_id
    ).delete()

    logger.info(f"Analytics data cleared for user {user_id}")
