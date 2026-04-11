"""Tests for TrainingCreditService."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.training.credit_service import TrainingCreditService


@pytest.fixture
def mock_settings():
    s = MagicMock()
    s.TRAINING_CREDIT_PAUSE_ASK_VOICE = 1
    s.TRAINING_CREDIT_PAUSE_ASK_LIPSYNC = 3
    s.TRAINING_CREDIT_COMPANION = 1
    s.TRAINING_CREDIT_COMPREHENSION = 1
    s.TRAINING_CREDIT_SEARCH = 2
    s.TRAINING_CREDIT_TALK_BACK = 3
    s.TRAINING_CREDIT_CULTURAL = 2
    s.TRAINING_CREDIT_RECAP = 2
    return s


@pytest.fixture
def service(mock_settings):
    return TrainingCreditService(mock_settings)


def test_get_cost_known_feature(service):
    assert service.get_cost("pause_ask_voice") == 1
    assert service.get_cost("pause_ask_lipsync") == 3
    assert service.get_cost("companion") == 1
    assert service.get_cost("search") == 2
    assert service.get_cost("talk_back") == 3


def test_get_cost_unknown_feature_raises(service):
    with pytest.raises(ValueError, match="Unknown training feature"):
        service.get_cost("nonexistent_feature")


@pytest.mark.asyncio
async def test_deduct_success(service):
    """Deduct credits when sufficient balance exists."""
    partner_id = "test_partner"

    with patch(
        "app.services.training.credit_service.IntegrationPartner"
    ) as MockPartner:
        coll = AsyncMock()
        MockPartner.get_pymongo_collection.return_value = coll
        coll.find_one_and_update = AsyncMock(return_value={
            "training_config": {
                "credits_used": 11,
                "credits_remaining": 489,
                "credit_limit_monthly": 500,
            }
        })

        success, remaining = await service.deduct(
            partner_id=partner_id,
            feature="pause_ask_voice",
        )

    assert success is True
    assert remaining == 489


@pytest.mark.asyncio
async def test_deduct_insufficient(service):
    """Reject when credits exhausted."""
    partner_id = "test_partner"

    with patch(
        "app.services.training.credit_service.IntegrationPartner"
    ) as MockPartner:
        coll = AsyncMock()
        MockPartner.get_pymongo_collection.return_value = coll
        coll.find_one_and_update = AsyncMock(return_value=None)

        success, remaining = await service.deduct(
            partner_id=partner_id,
            feature="pause_ask_lipsync",
        )

    assert success is False
    assert remaining == 0
