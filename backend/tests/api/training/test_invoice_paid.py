"""Tests for _handle_invoice_paid monthly credit reset."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

_MOD = "app.api.routes.training.checkout"


def _make_partner(partner_id="test-partner", credit_limit=500):
    partner = MagicMock()
    partner.id = "partner-oid-1"
    partner.partner_id = partner_id
    partner.training_config = {
        "stripe_subscription_id": "sub_123",
        "credit_limit_monthly": credit_limit,
        "credits_used": 350,
        "credits_remaining": 150,
        "payment_status": "past_due",
    }
    return partner


@pytest.mark.asyncio
async def test_invoice_paid_resets_credits():
    """Successful invoice.paid resets credits_used=0 and credits_remaining=limit."""
    partner = _make_partner(credit_limit=500)
    mock_collection = MagicMock()
    mock_collection.update_one = AsyncMock()

    with patch(f"{_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = mock_collection

        from app.api.routes.training.checkout import _handle_invoice_paid

        await _handle_invoice_paid({"subscription": "sub_123"})

        mock_collection.update_one.assert_awaited_once()
        call_args = mock_collection.update_one.call_args
        update_doc = call_args[0][1]["$set"]
        assert update_doc["training_config.credits_used"] == 0
        assert update_doc["training_config.credits_remaining"] == 500
        assert update_doc["training_config.payment_status"] == "current"


@pytest.mark.asyncio
async def test_invoice_paid_no_subscription_skips():
    """Invoice without subscription ID does nothing."""
    with patch(f"{_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock()

        from app.api.routes.training.checkout import _handle_invoice_paid

        await _handle_invoice_paid({"amount_paid": 4999})

        MockIP.find_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_invoice_paid_unknown_subscription_logs_warning():
    """No partner found for subscription logs warning, no crash."""
    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.logger") as mock_logger,
    ):
        MockIP.find_one = AsyncMock(return_value=None)

        from app.api.routes.training.checkout import _handle_invoice_paid

        await _handle_invoice_paid({"subscription": "sub_unknown"})

        mock_logger.warning.assert_called_once()
        assert "sub_unknown" in mock_logger.warning.call_args[0][1]


@pytest.mark.asyncio
async def test_invoice_paid_org_tier_uses_correct_limit():
    """Org with 2000 credit limit gets 2000 credits_remaining."""
    partner = _make_partner(credit_limit=2000)
    mock_collection = MagicMock()
    mock_collection.update_one = AsyncMock()

    with patch(f"{_MOD}.IntegrationPartner") as MockIP:
        MockIP.find_one = AsyncMock(return_value=partner)
        MockIP.get_pymongo_collection.return_value = mock_collection

        from app.api.routes.training.checkout import _handle_invoice_paid

        await _handle_invoice_paid({"subscription": "sub_123"})

        call_args = mock_collection.update_one.call_args
        update_doc = call_args[0][1]["$set"]
        assert update_doc["training_config.credits_remaining"] == 2000
        assert update_doc["training_config.credits_used"] == 0


@pytest.mark.asyncio
async def test_checkout_completed_sets_credits_remaining():
    """checkout.session.completed sets credits_remaining equal to tier credit limit."""
    # find_one is called twice: once chained with .update() (returns query object),
    # once awaited directly to fetch the partner for the webhook.
    mock_query = MagicMock()
    mock_query.update = AsyncMock()
    mock_partner = MagicMock()

    session = {
        "id": "cs_test_123",
        "subscription": "sub_new_456",
        "metadata": {
            "partner_id": "test-partner",
            "tier": "team",
        },
    }

    call_count = 0

    async def _find_one_side_effect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return mock_query
        return mock_partner

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.send_webhook_event", new_callable=AsyncMock),
    ):
        # First call returns the chainable query object (not awaited at find_one level);
        # Beanie's FindOne.update() is the coroutine. We make find_one itself synchronous
        # so the chain works: find_one(...).update(...) where update is the awaitable.
        mock_query_obj = MagicMock()
        mock_query_obj.update = AsyncMock()
        mock_partner_obj = MagicMock()

        find_one_call_count = 0

        def _sync_find_one(*args, **kwargs):
            nonlocal find_one_call_count
            find_one_call_count += 1
            if find_one_call_count == 1:
                return mock_query_obj
            # Second call is awaited directly — return an awaitable
            async def _awaitable():
                return mock_partner_obj
            return _awaitable()

        MockIP.find_one = _sync_find_one

        from app.api.routes.training.checkout import _handle_checkout_completed

        await _handle_checkout_completed(session)

        mock_query_obj.update.assert_awaited_once()
        set_doc = mock_query_obj.update.call_args[0][0]["$set"]
        assert set_doc["training_config.credits_remaining"] == 500
        assert set_doc["training_config.credits_used"] == 0
        assert set_doc["training_config.credit_limit_monthly"] == 500
        assert set_doc["training_config.org_tier"] == "team"


@pytest.mark.asyncio
async def test_checkout_completed_idempotent():
    """Replayed event_id is short-circuited; credits not reset twice."""
    session = {
        "id": "cs_test_replay",
        "subscription": "sub_replay",
        "metadata": {"partner_id": "test-partner", "tier": "team"},
    }
    event_id = "evt_replay_123"

    mock_partner = MagicMock()
    # Simulate that event_id was already recorded from the first call.
    mock_partner.training_config = {
        "processed_stripe_events": [event_id],
        "stripe_subscription_id": "sub_replay",
    }

    mock_query_obj = MagicMock()
    mock_query_obj.update = AsyncMock()
    mock_collection = MagicMock()
    mock_collection.update_one = AsyncMock()

    async def _async_partner(*args, **kwargs):
        return mock_partner

    def _sync_find_one(*args, **kwargs):
        return _async_partner()

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.send_webhook_event", new_callable=AsyncMock),
    ):
        MockIP.find_one = _sync_find_one
        MockIP.get_pymongo_collection.return_value = mock_collection

        from app.api.routes.training.checkout import _handle_checkout_completed

        await _handle_checkout_completed(session, event_id=event_id)

        # The credit-reset chained update must NOT have been called the
        # second time around.
        mock_query_obj.update.assert_not_awaited()
        # The processed-events $addToSet must also not have been called
        # (short-circuit returns before the write).
        mock_collection.update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_checkout_completed_records_event_id_first_time():
    """First-time event_id triggers credit reset AND records event_id."""
    session = {
        "id": "cs_test_first",
        "subscription": "sub_first",
        "metadata": {"partner_id": "test-partner", "tier": "team"},
    }
    event_id = "evt_first_456"

    # Partner with empty processed_stripe_events list
    mock_partner_existing = MagicMock()
    mock_partner_existing.training_config = {
        "processed_stripe_events": [],
    }
    mock_partner_after = MagicMock()
    mock_query_obj = MagicMock()
    mock_query_obj.update = AsyncMock()
    mock_collection = MagicMock()
    mock_collection.update_one = AsyncMock()

    find_one_call_count = 0

    def _sync_find_one(*args, **kwargs):
        nonlocal find_one_call_count
        find_one_call_count += 1
        # 1st call: idempotency lookup -> existing partner
        # 2nd call: credit-reset chain target -> chainable query
        # 3rd call: post-update partner reload -> awaitable
        if find_one_call_count == 1:
            async def _aw():
                return mock_partner_existing
            return _aw()
        if find_one_call_count == 2:
            return mock_query_obj

        async def _aw2():
            return mock_partner_after
        return _aw2()

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.send_webhook_event", new_callable=AsyncMock),
    ):
        MockIP.find_one = _sync_find_one
        MockIP.get_pymongo_collection.return_value = mock_collection

        from app.api.routes.training.checkout import _handle_checkout_completed

        await _handle_checkout_completed(session, event_id=event_id)

    mock_query_obj.update.assert_awaited_once()
    mock_collection.update_one.assert_awaited_once()
    add_to_set = mock_collection.update_one.call_args[0][1]["$addToSet"]
    assert add_to_set["training_config.processed_stripe_events"] == event_id


@pytest.mark.asyncio
async def test_checkout_completed_org_tier_sets_2000_credits_remaining():
    """checkout.session.completed for organization tier sets credits_remaining=2000."""
    session = {
        "id": "cs_test_org",
        "subscription": "sub_org_789",
        "metadata": {
            "partner_id": "org-partner",
            "tier": "organization",
        },
    }

    mock_query_obj = MagicMock()
    mock_query_obj.update = AsyncMock()
    mock_partner_obj = MagicMock()

    find_one_call_count = 0

    def _sync_find_one(*args, **kwargs):
        nonlocal find_one_call_count
        find_one_call_count += 1
        if find_one_call_count == 1:
            return mock_query_obj

        async def _awaitable():
            return mock_partner_obj
        return _awaitable()

    with (
        patch(f"{_MOD}.IntegrationPartner") as MockIP,
        patch(f"{_MOD}.send_webhook_event", new_callable=AsyncMock),
    ):
        MockIP.find_one = _sync_find_one

        from app.api.routes.training.checkout import _handle_checkout_completed

        await _handle_checkout_completed(session)

        set_doc = mock_query_obj.update.call_args[0][0]["$set"]
        assert set_doc["training_config.credits_remaining"] == 2000
        assert set_doc["training_config.credits_used"] == 0
