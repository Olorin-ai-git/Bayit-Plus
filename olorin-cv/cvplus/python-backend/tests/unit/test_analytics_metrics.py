"""
Unit Tests for Analytics Metrics
Tests profile and CV analytics with aggregation pipelines
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta

from bson import ObjectId


@pytest.mark.asyncio
async def test_get_profile_analytics_not_found():
    """Test get profile analytics when profile not found"""
    with patch('app.services.analytics.service.Profile') as mock_profile_class:
        mock_profile_class.get = AsyncMock(return_value=None)

        from app.services.analytics import AnalyticsService
        service = AnalyticsService()

        with pytest.raises(PermissionError, match="Profile not found"):
            await service.get_profile_analytics("invalid_id", "user_id")


@pytest.mark.asyncio
async def test_get_profile_analytics_wrong_owner():
    """Test get profile analytics with wrong owner"""
    with patch('app.services.analytics.service.Profile') as mock_profile_class:
        mock_profile = MagicMock()
        mock_profile.id = ObjectId()
        mock_profile.user_id = "owner_user_id"
        mock_profile.slug = "test-slug"

        mock_profile_class.get = AsyncMock(return_value=mock_profile)

        from app.services.analytics import AnalyticsService
        service = AnalyticsService()

        with pytest.raises(PermissionError, match="access denied"):
            await service.get_profile_analytics(str(mock_profile.id), "wrong_user_id")


@pytest.mark.asyncio
async def test_get_profile_analytics_with_data():
    """Test get profile analytics with aggregated data"""
    with patch('app.services.analytics.service.Profile') as mock_profile_class:
        with patch('app.services.analytics.service.AnalyticsEvent') as mock_event_class:
            mock_profile = MagicMock()
            mock_profile.id = ObjectId()
            mock_profile.user_id = "test_user"
            mock_profile.slug = "test-profile"
            mock_profile_class.get = AsyncMock(return_value=mock_profile)

            mock_result = [{
                "event_counts": [
                    {"_id": "view", "count": 75},
                    {"_id": "contact", "count": 5}
                ],
                "unique_visitors": [{"count": 40}],
                "recent_activity": [
                    {
                        "type": "view",
                        "timestamp": datetime.utcnow(),
                        "source": "linkedin.com"
                    }
                ]
            }]

            mock_aggregate = MagicMock()
            mock_aggregate.to_list = AsyncMock(return_value=mock_result)
            mock_event_class.aggregate.return_value = mock_aggregate

            from app.services.analytics import AnalyticsService
            service = AnalyticsService()

            result = await service.get_profile_analytics(
                str(mock_profile.id),
                "test_user"
            )

            assert result["profile_id"] == str(mock_profile.id)
            assert result["slug"] == "test-profile"
            assert result["total_views"] == 75
            assert result["unique_visitors"] == 40
            assert result["contact_requests"] == 5


@pytest.mark.asyncio
async def test_get_cv_metrics_not_found():
    """Test get CV metrics when CV not found"""
    with patch('app.services.analytics.service.CV') as mock_cv_class:
        mock_cv_class.get = AsyncMock(return_value=None)

        from app.services.analytics import AnalyticsService
        service = AnalyticsService()

        with pytest.raises(PermissionError, match="CV not found"):
            await service.get_cv_metrics("invalid_id", "user_id")


@pytest.mark.asyncio
async def test_get_cv_metrics_with_data():
    """Test get CV metrics with aggregated data"""
    with patch('app.services.analytics.service.CV') as mock_cv_class:
        with patch('app.services.analytics.service.AnalyticsEvent') as mock_event_class:
            mock_cv = MagicMock()
            mock_cv.id = ObjectId()
            mock_cv.user_id = "test_user"
            mock_cv.analysis_id = None
            mock_cv.updated_at = datetime.utcnow()
            mock_cv.created_at = datetime.utcnow() - timedelta(days=7)
            mock_cv_class.get = AsyncMock(return_value=mock_cv)

            mock_results = [
                {"_id": "view", "count": 50},
                {"_id": "download", "count": 10}
            ]

            mock_aggregate = MagicMock()
            mock_aggregate.to_list = AsyncMock(return_value=mock_results)
            mock_event_class.aggregate.return_value = mock_aggregate

            from app.services.analytics import AnalyticsService
            service = AnalyticsService()

            result = await service.get_cv_metrics(str(mock_cv.id), "test_user")

            assert result["cv_id"] == str(mock_cv.id)
            assert result["views"] == 50
            assert result["downloads"] == 10
            assert result["analysis_score"] is None
