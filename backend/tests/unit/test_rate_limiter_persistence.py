"""
Rate Limiter Persistence Tests

Validates MongoDB-backed rate limiting with in-memory fallback.
"""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.integration_partner import RateLimitConfig


class TestSlidingWindowCounter:
    """In-memory fallback counter tests."""

    @pytest.mark.asyncio
    async def test_add_and_count(self):
        from app.services.olorin.rate_limiter import SlidingWindowCounter

        counter = SlidingWindowCounter(window_seconds=60)
        await counter.add_request()
        await counter.add_request()
        assert await counter.get_count() == 2

    @pytest.mark.asyncio
    async def test_expired_buckets_cleaned(self):
        from app.services.olorin.rate_limiter import SlidingWindowCounter

        counter = SlidingWindowCounter(window_seconds=1)
        await counter.add_request()
        await asyncio.sleep(1.1)
        assert await counter.get_count() == 0


class TestRateLimiterStore:
    """MongoDB store layer tests (mocked)."""

    def test_bucket_key_format(self):
        from app.services.olorin.rate_limiter_store import _bucket_key

        key = _bucket_key("partner-1", "pause_ask", "minute", 60)
        parts = key.split(":")
        assert parts[0] == "partner-1"
        assert parts[1] == "pause_ask"
        assert parts[2] == "minute"
        assert parts[3].isdigit()

    def test_bucket_expiry_is_future(self):
        from app.services.olorin.rate_limiter_store import _bucket_expiry
        from datetime import datetime, timezone

        expiry = _bucket_expiry(60)
        assert expiry > datetime.now(timezone.utc)

    @pytest.mark.asyncio
    async def test_increment_calls_upsert(self):
        mock_coll = MagicMock()
        mock_coll.find_one_and_update = AsyncMock(return_value=None)

        with patch(
            "app.services.olorin.rate_limiter_store._get_collection",
            return_value=mock_coll,
        ):
            from app.services.olorin.rate_limiter_store import increment

            await increment("test-partner", "trivia", "minute", 60)
            mock_coll.find_one_and_update.assert_called_once()
            call_args = mock_coll.find_one_and_update.call_args
            assert "$inc" in call_args[0][1]
            assert call_args[0][1]["$inc"]["count"] == 1

    @pytest.mark.asyncio
    async def test_get_count_weighted_sliding_window(self):
        """Verify weighted sliding window calculation."""
        mock_coll = MagicMock()
        now = time.time()
        current_bucket = int(now // 60)

        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(
            return_value=[
                {
                    "key": f"p:c:minute:{current_bucket}",
                    "count": 10,
                },
                {
                    "key": f"p:c:minute:{current_bucket - 1}",
                    "count": 20,
                },
            ]
        )
        mock_coll.find = MagicMock(return_value=mock_cursor)

        with patch(
            "app.services.olorin.rate_limiter_store._get_collection",
            return_value=mock_coll,
        ):
            from app.services.olorin.rate_limiter_store import get_count

            count = await get_count("p", "c", "minute", 60)
            assert count >= 10
            assert count <= 30

    @pytest.mark.asyncio
    async def test_get_count_empty_collection(self):
        mock_coll = MagicMock()
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        mock_coll.find = MagicMock(return_value=mock_cursor)

        with patch(
            "app.services.olorin.rate_limiter_store._get_collection",
            return_value=mock_coll,
        ):
            from app.services.olorin.rate_limiter_store import get_count

            count = await get_count("p", "c", "minute", 60)
            assert count == 0


class TestPartnerRateLimiter:
    """Integration tests for the PartnerRateLimiter class."""

    @pytest.mark.asyncio
    async def test_within_limits_returns_true(self):
        with patch(
            "app.services.olorin.rate_limiter.store.get_count",
            new_callable=AsyncMock,
            return_value=5,
        ):
            from app.services.olorin.rate_limiter import PartnerRateLimiter

            limiter = PartnerRateLimiter()
            limits = RateLimitConfig(
                requests_per_minute=100,
                requests_per_hour=1000,
                requests_per_day=10000,
            )
            ok, msg = await limiter.check_rate_limit("p", "pause_ask", limits)
            assert ok is True
            assert msg is None

    @pytest.mark.asyncio
    async def test_exceeded_limit_returns_false(self):
        with patch(
            "app.services.olorin.rate_limiter.store.get_count",
            new_callable=AsyncMock,
            return_value=100,
        ):
            from app.services.olorin.rate_limiter import PartnerRateLimiter

            limiter = PartnerRateLimiter()
            limits = RateLimitConfig(
                requests_per_minute=100,
                requests_per_hour=1000,
                requests_per_day=10000,
            )
            ok, msg = await limiter.check_rate_limit("p", "pause_ask", limits)
            assert ok is False
            assert "Rate limit exceeded" in msg
            assert "minute" in msg

    @pytest.mark.asyncio
    async def test_falls_back_to_memory_on_timeout(self):
        async def slow_get_count(*args, **kwargs):
            await asyncio.sleep(1)
            return 0

        with patch(
            "app.services.olorin.rate_limiter.store.get_count",
            side_effect=slow_get_count,
        ):
            from app.services.olorin.rate_limiter import PartnerRateLimiter

            limiter = PartnerRateLimiter()
            limits = RateLimitConfig(
                requests_per_minute=100,
                requests_per_hour=1000,
                requests_per_day=10000,
            )
            ok, msg = await limiter.check_rate_limit("p", "pause_ask", limits)
            assert ok is True

    @pytest.mark.asyncio
    async def test_record_request_calls_store(self):
        with patch(
            "app.services.olorin.rate_limiter.store.ensure_indexes",
            new_callable=AsyncMock,
        ), patch(
            "app.services.olorin.rate_limiter.store.increment",
            new_callable=AsyncMock,
        ) as mock_inc:
            from app.services.olorin.rate_limiter import PartnerRateLimiter

            limiter = PartnerRateLimiter()
            await limiter.record_request("p", "trivia")
            assert mock_inc.call_count == 3

    @pytest.mark.asyncio
    async def test_record_request_fallback_on_error(self):
        with patch(
            "app.services.olorin.rate_limiter.store.ensure_indexes",
            new_callable=AsyncMock,
        ), patch(
            "app.services.olorin.rate_limiter.store.increment",
            new_callable=AsyncMock,
            side_effect=Exception("DB down"),
        ):
            from app.services.olorin.rate_limiter import PartnerRateLimiter

            limiter = PartnerRateLimiter()
            await limiter.record_request("p", "trivia")
            fb = limiter._get_fallback("p", "trivia", "minute", 60)
            count = await fb.get_count()
            assert count == 1

    @pytest.mark.asyncio
    async def test_get_usage_stats(self):
        with patch(
            "app.services.olorin.rate_limiter.store.get_count",
            new_callable=AsyncMock,
            return_value=42,
        ):
            from app.services.olorin.rate_limiter import PartnerRateLimiter

            limiter = PartnerRateLimiter()
            stats = await limiter.get_usage_stats("p", "pause_ask")
            assert stats["requests_per_minute"] == 42
            assert stats["requests_per_hour"] == 42
            assert stats["requests_per_day"] == 42

    def test_reset_clears_fallback(self):
        from app.services.olorin.rate_limiter import PartnerRateLimiter

        limiter = PartnerRateLimiter()
        limiter._get_fallback("p", "c", "minute", 60)
        assert "p" in limiter._fallback
        limiter.reset("p")
        assert "p" not in limiter._fallback

    def test_reset_all_clears_everything(self):
        from app.services.olorin.rate_limiter import PartnerRateLimiter

        limiter = PartnerRateLimiter()
        limiter._get_fallback("p1", "c", "minute", 60)
        limiter._get_fallback("p2", "c", "minute", 60)
        limiter.reset()
        assert len(limiter._fallback) == 0
