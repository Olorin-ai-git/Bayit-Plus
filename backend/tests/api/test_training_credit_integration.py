"""Integration test: training credit deduction blocks when exhausted."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.training.credit_service import TrainingCreditService


@pytest.fixture
def service():
    s = MagicMock()
    s.TRAINING_CREDIT_COMPANION = 1
    s.TRAINING_CREDIT_PAUSE_ASK_VOICE = 1
    s.TRAINING_CREDIT_PAUSE_ASK_LIPSYNC = 3
    s.TRAINING_CREDIT_COMPREHENSION = 1
    s.TRAINING_CREDIT_SEARCH = 2
    s.TRAINING_CREDIT_TALK_BACK = 3
    s.TRAINING_CREDIT_CULTURAL = 2
    s.TRAINING_CREDIT_RECAP = 2
    return TrainingCreditService(s)


@pytest.mark.asyncio
async def test_sequential_deductions_exhaust_credits(service):
    """Credits decrease with each deduction until exhausted."""
    partner_id = "exhaust_test"
    calls = []

    async def mock_update(query, update, **kwargs):
        nonlocal calls
        calls.append(update)
        used = sum(
            c["$inc"]["training_config.credits_used"]
            for c in calls
        )
        limit = 5
        if used > limit:
            calls.pop()
            return None
        return {
            "training_config": {
                "credits_used": used,
                "credits_remaining": limit - used,
                "credit_limit_monthly": limit,
            }
        }

    with patch(
        "app.services.training.credit_service.IntegrationPartner"
    ) as MockPartner:
        coll = AsyncMock()
        MockPartner.get_pymongo_collection.return_value = coll
        coll.find_one_and_update = mock_update

        ok1, r1 = await service.deduct(partner_id, "companion")
        assert ok1 is True
        assert r1 == 4

        ok2, r2 = await service.deduct(partner_id, "search")
        assert ok2 is True
        assert r2 == 2

        ok3, r3 = await service.deduct(partner_id, "pause_ask_lipsync")
        assert ok3 is False
        assert r3 == 0


@pytest.mark.asyncio
async def test_zero_cost_feature_always_succeeds(service):
    """A feature with cost=0 should bypass the DB entirely."""
    service._rate_map["companion"] = 0

    with patch(
        "app.services.training.credit_service.IntegrationPartner"
    ) as MockPartner:
        coll = AsyncMock()
        MockPartner.get_pymongo_collection.return_value = coll

        ok, remaining = await service.deduct("any_partner", "companion")

    assert ok is True
    assert remaining == -1
    coll.find_one_and_update.assert_not_awaited()


@pytest.mark.asyncio
async def test_independent_partners_isolated(service):
    """Credit deductions for one partner do not affect another."""
    state = {"p1_used": 0, "p2_used": 0}

    async def mock_update(query, update, **kwargs):
        pid = query["partner_id"]
        cost = update["$inc"]["training_config.credits_used"]
        key = f"{pid}_used"
        new_used = state[key] + cost
        limit = 3
        if new_used > limit:
            return None
        state[key] = new_used
        return {
            "training_config": {
                "credits_used": new_used,
                "credits_remaining": limit - new_used,
                "credit_limit_monthly": limit,
            }
        }

    with patch(
        "app.services.training.credit_service.IntegrationPartner"
    ) as MockPartner:
        coll = AsyncMock()
        MockPartner.get_pymongo_collection.return_value = coll
        coll.find_one_and_update = mock_update

        ok1, r1 = await service.deduct("p1", "companion")
        assert ok1 is True
        assert r1 == 2

        ok2, r2 = await service.deduct("p2", "search")
        assert ok2 is True
        assert r2 == 1

        ok3, r3 = await service.deduct("p1", "talk_back")
        assert ok3 is False
        assert r3 == 0

        ok4, r4 = await service.deduct("p2", "companion")
        assert ok4 is True
        assert r4 == 0
