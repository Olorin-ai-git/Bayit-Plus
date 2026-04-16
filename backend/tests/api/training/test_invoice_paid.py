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
