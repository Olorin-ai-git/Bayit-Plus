"""
Analytics Response Formatters
Format aggregation results into response structures
"""

from datetime import datetime
from typing import Dict, List


def format_user_summary(
    result: Dict,
    days: int,
    start_date: datetime
) -> Dict:
    """
    Format user summary aggregation result

    Args:
        result: Raw aggregation result
        days: Number of days in time period
        start_date: Start date of time period

    Returns:
        Formatted summary dict
    """
    # Extract event counts
    event_counts = {
        item["_id"]: item["count"]
        for item in result.get("event_counts", [])
    }
    total_views = event_counts.get("view", 0)
    total_downloads = event_counts.get("download", 0)

    # Extract unique visitors
    unique_visitors_list = result.get("unique_visitors", [])
    unique_visitors = unique_visitors_list[0]["count"] if unique_visitors_list else 0

    # Format top sources
    top_sources = [
        {"source": item["_id"], "count": item["count"]}
        for item in result.get("top_sources", [])
    ]

    return {
        "total_views": total_views,
        "total_downloads": total_downloads,
        "unique_visitors": unique_visitors,
        "top_sources": top_sources,
        "time_period": f"Last {days} days",
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
    }


def format_empty_summary(days: int, start_date: datetime) -> Dict:
    """Return empty summary when no data exists"""
    return {
        "total_views": 0,
        "total_downloads": 0,
        "unique_visitors": 0,
        "top_sources": [],
        "time_period": f"Last {days} days",
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
    }


def format_profile_analytics(
    result: Dict,
    profile_id: str,
    slug: str
) -> Dict:
    """
    Format profile analytics aggregation result

    Args:
        result: Raw aggregation result
        profile_id: Profile ID
        slug: Profile slug

    Returns:
        Formatted analytics dict
    """
    # Extract event counts
    event_counts = {
        item["_id"]: item["count"]
        for item in result.get("event_counts", [])
    }
    total_views = event_counts.get("view", 0)
    contact_requests = event_counts.get("contact", 0)

    # Extract unique visitors
    unique_visitors_list = result.get("unique_visitors", [])
    unique_visitors = unique_visitors_list[0]["count"] if unique_visitors_list else 0

    # Format recent activity
    recent_activity = [
        {
            "type": item["type"],
            "timestamp": item["timestamp"].isoformat() if item.get("timestamp") else None,
            "source": item.get("source", "direct"),
        }
        for item in result.get("recent_activity", [])
    ]

    return {
        "profile_id": profile_id,
        "slug": slug,
        "total_views": total_views,
        "unique_visitors": unique_visitors,
        "contact_requests": contact_requests,
        "recent_activity": recent_activity,
    }


def format_empty_profile_analytics(profile_id: str, slug: str) -> Dict:
    """Return empty profile analytics when no data exists"""
    return {
        "profile_id": profile_id,
        "slug": slug,
        "total_views": 0,
        "unique_visitors": 0,
        "contact_requests": 0,
        "recent_activity": [],
    }


def format_cv_metrics(
    results: List[Dict],
    cv_id: str,
    cv,
    analysis
) -> Dict:
    """
    Format CV metrics aggregation result

    Args:
        results: Raw aggregation results
        cv_id: CV ID
        cv: CV document
        analysis: Analysis document (may be None)

    Returns:
        Formatted metrics dict
    """
    # Extract event counts
    event_counts = {item["_id"]: item["count"] for item in results}
    views = event_counts.get("view", 0)
    downloads = event_counts.get("download", 0)

    return {
        "cv_id": cv_id,
        "analysis_score": analysis.ats_score if analysis else None,
        "completeness": analysis.completeness_score if analysis else None,
        "views": views,
        "downloads": downloads,
        "last_updated": cv.updated_at.isoformat(),
        "created_at": cv.created_at.isoformat(),
    }
