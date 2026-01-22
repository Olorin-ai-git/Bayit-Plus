"""
Analytics Aggregation Pipelines
MongoDB aggregation pipeline builders for analytics queries
"""

from datetime import datetime
from typing import Dict, List


def build_user_summary_pipeline(user_id: str, start_date: datetime) -> List[Dict]:
    """
    Build aggregation pipeline for user analytics summary

    Args:
        user_id: User ID to filter events
        start_date: Start date for time range

    Returns:
        MongoDB aggregation pipeline
    """
    return [
        {
            "$match": {
                "user_id": user_id,
                "created_at": {"$gte": start_date}
            }
        },
        {
            "$facet": {
                "event_counts": [
                    {
                        "$group": {
                            "_id": "$event_type",
                            "count": {"$sum": 1}
                        }
                    }
                ],
                "unique_visitors": [
                    {
                        "$match": {
                            "event_type": "view",
                            "visitor_id": {"$ne": None}
                        }
                    },
                    {
                        "$group": {
                            "_id": "$visitor_id"
                        }
                    },
                    {
                        "$count": "count"
                    }
                ],
                "top_sources": [
                    {
                        "$match": {
                            "referrer": {"$ne": None}
                        }
                    },
                    {
                        "$group": {
                            "_id": "$referrer",
                            "count": {"$sum": 1}
                        }
                    },
                    {"$sort": {"count": -1}},
                    {"$limit": 5}
                ]
            }
        }
    ]


def build_profile_analytics_pipeline(profile_id: str) -> List[Dict]:
    """
    Build aggregation pipeline for profile analytics

    Args:
        profile_id: Profile ID to filter events

    Returns:
        MongoDB aggregation pipeline
    """
    return [
        {
            "$match": {
                "profile_id": profile_id
            }
        },
        {
            "$facet": {
                "event_counts": [
                    {
                        "$group": {
                            "_id": "$event_type",
                            "count": {"$sum": 1}
                        }
                    }
                ],
                "unique_visitors": [
                    {
                        "$match": {
                            "event_type": "view",
                            "visitor_id": {"$ne": None}
                        }
                    },
                    {
                        "$group": {
                            "_id": "$visitor_id"
                        }
                    },
                    {
                        "$count": "count"
                    }
                ],
                "recent_activity": [
                    {"$sort": {"created_at": -1}},
                    {"$limit": 10},
                    {
                        "$project": {
                            "type": "$event_type",
                            "timestamp": "$created_at",
                            "source": {"$ifNull": ["$referrer", "direct"]}
                        }
                    }
                ]
            }
        }
    ]


def build_cv_metrics_pipeline(cv_id: str) -> List[Dict]:
    """
    Build aggregation pipeline for CV metrics

    Args:
        cv_id: CV ID to filter events

    Returns:
        MongoDB aggregation pipeline
    """
    return [
        {
            "$match": {
                "cv_id": cv_id
            }
        },
        {
            "$group": {
                "_id": "$event_type",
                "count": {"$sum": 1}
            }
        }
    ]
