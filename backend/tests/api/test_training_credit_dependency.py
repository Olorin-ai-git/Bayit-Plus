"""Tests for deduct_training_credits dependency."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.api.routes.training.dependencies import deduct_training_credits


@pytest.mark.asyncio
async def test_deduct_success():
    """Credits deducted, returns remaining."""
    mock_user = MagicMock()
    mock_user.partner_id = "p1"

    with patch(
        "app.api.routes.training.dependencies._get_credit_service"
    ) as mock_get:
        svc = AsyncMock()
        svc.deduct = AsyncMock(return_value=(True, 42))
        mock_get.return_value = svc

        remaining = await deduct_training_credits("companion", mock_user)

    assert remaining == 42
    svc.deduct.assert_awaited_once_with(partner_id="p1", feature="companion")


@pytest.mark.asyncio
async def test_deduct_insufficient_raises_402():
    """Insufficient credits raises HTTP 402."""
    mock_user = MagicMock()
    mock_user.partner_id = "p1"

    with patch(
        "app.api.routes.training.dependencies._get_credit_service"
    ) as mock_get:
        svc = AsyncMock()
        svc.deduct = AsyncMock(return_value=(False, 0))
        mock_get.return_value = svc

        with pytest.raises(HTTPException) as exc_info:
            await deduct_training_credits("pause_ask_lipsync", mock_user)

    assert exc_info.value.status_code == 402
    assert "Insufficient AI credits" in exc_info.value.detail
