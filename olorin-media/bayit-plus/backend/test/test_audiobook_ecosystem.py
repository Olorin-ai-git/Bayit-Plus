"""
Tests for Audiobook Ecosystem Features

Tests for user favorites, ratings, reviews, and metering.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch

from app.services.audiobook_metering import (
    AudiobookMeteringService,
    AudiobookEventType,
)
from app.models.user_audiobook import (
    UserAudiobook,
    UserAudiobookReview,
    UserAudiobookActionType,
)


@pytest.mark.asyncio
class TestAudiobookMeteringService:
    """Test audiobook metering service"""

    async def test_log_stream_started(self):
        """Test logging stream start event"""
        service = AudiobookMeteringService()
        user_id = "user_123"
        audiobook_id = "audiobook_456"

        event = await service.log_stream_started(user_id, audiobook_id)

        assert event["user_id"] == user_id
        assert event["audiobook_id"] == audiobook_id
        assert event["event_type"] == AudiobookEventType.STREAM_STARTED.value
        assert event["duration_seconds"] == 0
        assert "timestamp" in event

    async def test_log_stream_completed(self):
        """Test logging stream completion event"""
        service = AudiobookMeteringService()
        user_id = "user_123"
        audiobook_id = "audiobook_456"
        duration_seconds = 3600

        event = await service.log_stream_completed(
            user_id,
            audiobook_id,
            duration_seconds
        )

        assert event["user_id"] == user_id
        assert event["audiobook_id"] == audiobook_id
        assert event["event_type"] == AudiobookEventType.STREAM_COMPLETED.value
        assert event["duration_seconds"] == duration_seconds

    async def test_log_stream_paused(self):
        """Test logging stream pause event"""
        service = AudiobookMeteringService()
        user_id = "user_123"
        audiobook_id = "audiobook_456"
        elapsed_seconds = 1200

        event = await service.log_stream_paused(
            user_id,
            audiobook_id,
            elapsed_seconds
        )

        assert event["event_type"] == AudiobookEventType.STREAM_PAUSED.value
        assert event["duration_seconds"] == elapsed_seconds

    async def test_log_stream_resumed(self):
        """Test logging stream resume event"""
        service = AudiobookMeteringService()
        user_id = "user_123"
        audiobook_id = "audiobook_456"
        position_seconds = 1200

        event = await service.log_stream_resumed(
            user_id,
            audiobook_id,
            position_seconds
        )

        assert event["event_type"] == AudiobookEventType.STREAM_RESUMED.value
        assert event["duration_seconds"] == position_seconds

    async def test_get_user_audiobook_usage(self):
        """Test fetching user audiobook usage stats"""
        service = AudiobookMeteringService()
        user_id = "user_123"

        usage = await service.get_user_audiobook_usage(user_id)

        assert usage["user_id"] == user_id
        assert usage["total_streams"] == 0
        assert usage["total_duration_seconds"] == 0
        assert usage["unique_audiobooks"] == 0


@pytest.mark.asyncio
class TestUserAudiobookModel:
    """Test user audiobook model"""

    async def test_create_user_audiobook_favorite(self):
        """Test creating user audiobook favorite"""
        user_audiobook = UserAudiobook(
            user_id="user_123",
            audiobook_id="audiobook_456",
            is_favorite=True,
            last_action_type=UserAudiobookActionType.FAVORITE,
        )

        assert user_audiobook.user_id == "user_123"
        assert user_audiobook.audiobook_id == "audiobook_456"
        assert user_audiobook.is_favorite is True
        assert user_audiobook.rating is None

    async def test_create_user_audiobook_with_rating(self):
        """Test creating user audiobook with rating"""
        user_audiobook = UserAudiobook(
            user_id="user_123",
            audiobook_id="audiobook_456",
            rating=5,
            last_action_type=UserAudiobookActionType.RATE,
        )

        assert user_audiobook.rating == 5
        assert 1 <= user_audiobook.rating <= 5

    async def test_invalid_rating_fails(self):
        """Test that invalid rating raises error"""
        with pytest.raises(ValueError):
            UserAudiobook(
                user_id="user_123",
                audiobook_id="audiobook_456",
                rating=6,
                last_action_type=UserAudiobookActionType.RATE,
            )

    async def test_invalid_rating_zero_fails(self):
        """Test that zero rating raises error"""
        with pytest.raises(ValueError):
            UserAudiobook(
                user_id="user_123",
                audiobook_id="audiobook_456",
                rating=0,
                last_action_type=UserAudiobookActionType.RATE,
            )


@pytest.mark.asyncio
class TestUserAudiobookReview:
    """Test user audiobook review model"""

    async def test_create_review(self):
        """Test creating audiobook review"""
        review = UserAudiobookReview(
            user_id="user_123",
            audiobook_id="audiobook_456",
            rating=5,
            review_text="Excellent audiobook!",
        )

        assert review.user_id == "user_123"
        assert review.audiobook_id == "audiobook_456"
        assert review.rating == 5
        assert review.review_text == "Excellent audiobook!"
        assert review.helpful_count == 0

    async def test_review_without_text(self):
        """Test creating review with rating only"""
        review = UserAudiobookReview(
            user_id="user_123",
            audiobook_id="audiobook_456",
            rating=4,
        )

        assert review.rating == 4
        assert review.review_text is None

    async def test_review_text_max_length(self):
        """Test review text respects max length"""
        long_text = "a" * 1001
        with pytest.raises(ValueError):
            UserAudiobookReview(
                user_id="user_123",
                audiobook_id="audiobook_456",
                rating=5,
                review_text=long_text,
            )

    async def test_review_helpful_votes(self):
        """Test tracking helpful votes on review"""
        review = UserAudiobookReview(
            user_id="user_123",
            audiobook_id="audiobook_456",
            rating=5,
            review_text="Great!",
            helpful_count=10,
            unhelpful_count=2,
        )

        assert review.helpful_count == 10
        assert review.unhelpful_count == 2
