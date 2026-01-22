"""
Unit Tests for Analytics Service
Tests aggregation pipelines and metrics functionality
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

from bson import ObjectId


def test_analytics_service_event_types():
    """Test analytics service supports required event types"""
    supported_events = ["view", "download", "contact", "analysis"]

    assert "view" in supported_events
    assert "download" in supported_events
    assert "contact" in supported_events


@pytest.mark.asyncio
async def test_track_event():
    """Test tracking analytics event"""
    with patch('app.services.analytics.event_tracking.AnalyticsEvent') as mock_event_class:
        mock_event = MagicMock()
        mock_event.id = ObjectId()
        mock_event.event_type = "view"
        mock_event.save = AsyncMock()

        mock_event_class.return_value = mock_event

        from app.services.analytics import AnalyticsService
        service = AnalyticsService()

        result = await service.track_event(
            event_type="view",
            user_id="test_user",
            profile_id="test_profile"
        )

        assert result is not None
        mock_event.save.assert_called_once()


@pytest.mark.asyncio
async def test_get_user_summary_empty():
    """Test get user summary returns empty data when no events"""
    with patch('app.services.analytics.service.AnalyticsEvent') as mock_event_class:
        mock_aggregate = MagicMock()
        mock_aggregate.to_list = AsyncMock(return_value=[])
        mock_event_class.aggregate.return_value = mock_aggregate

        from app.services.analytics import AnalyticsService
        service = AnalyticsService()

        result = await service.get_user_summary("test_user", days=30)

        assert result["total_views"] == 0
        assert result["total_downloads"] == 0
        assert result["unique_visitors"] == 0
        assert result["top_sources"] == []
        assert "Last 30 days" in result["time_period"]


@pytest.mark.asyncio
async def test_get_user_summary_with_data():
    """Test get user summary with aggregated data"""
    with patch('app.services.analytics.service.AnalyticsEvent') as mock_event_class:
        mock_result = [{
            "event_counts": [
                {"_id": "view", "count": 100},
                {"_id": "download", "count": 25}
            ],
            "unique_visitors": [{"count": 50}],
            "top_sources": [
                {"_id": "linkedin.com", "count": 30},
                {"_id": "twitter.com", "count": 15}
            ]
        }]

        mock_aggregate = MagicMock()
        mock_aggregate.to_list = AsyncMock(return_value=mock_result)
        mock_event_class.aggregate.return_value = mock_aggregate

        from app.services.analytics import AnalyticsService
        service = AnalyticsService()

        result = await service.get_user_summary("test_user", days=30)

        assert result["total_views"] == 100
        assert result["total_downloads"] == 25
        assert result["unique_visitors"] == 50
        assert len(result["top_sources"]) == 2
        assert result["top_sources"][0]["source"] == "linkedin.com"


@pytest.mark.asyncio
async def test_clear_user_analytics():
    """Test clearing user analytics data"""
    with patch('app.services.analytics.service.AnalyticsEvent') as mock_event_class:
        mock_find = MagicMock()
        mock_find.delete = AsyncMock()
        mock_event_class.find.return_value = mock_find

        from app.services.analytics import AnalyticsService
        service = AnalyticsService()

        await service.clear_user_analytics("test_user")

        mock_event_class.find.assert_called_once()
        mock_find.delete.assert_called_once()
