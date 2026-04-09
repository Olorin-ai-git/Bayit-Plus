"""Unit tests for trial expiry enforcement in require_training_admin."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.asyncio


def _make_user(role: str = "admin") -> MagicMock:
    user = MagicMock()
    user.role = role
    user.partner_id = "training-testorg-abc12345"
    return user


def _make_partner(
    trial_ends_at: datetime | None,
    stripe_subscription_id: str | None = None,
) -> MagicMock:
    partner = MagicMock()
    partner.training_config = {
        "trial_ends_at": trial_ends_at,
        "stripe_subscription_id": stripe_subscription_id,
    }
    return partner


class TestRequireTrainingAdmin:

    async def test_expired_trial_raises_402(self):
        """Admin with expired trial and no subscription gets 402."""
        from fastapi import HTTPException
        from app.api.routes.training.dependencies import require_training_admin

        user = _make_user("admin")
        expired_at = datetime.now(timezone.utc) - timedelta(days=1)
        partner = _make_partner(trial_ends_at=expired_at)

        with patch(
            "app.api.routes.training.dependencies.IntegrationPartner"
        ) as mock_ip:
            mock_ip.find_one = AsyncMock(return_value=partner)
            with pytest.raises(HTTPException) as exc_info:
                await require_training_admin(user)
            mock_ip.find_one.assert_called_once_with({"partner_id": "training-testorg-abc12345"})

        assert exc_info.value.status_code == 402
        assert "trial" in exc_info.value.detail.lower()

    async def test_active_trial_passes(self):
        """Admin with active trial passes through."""
        from app.api.routes.training.dependencies import require_training_admin

        user = _make_user("admin")
        ends_at = datetime.now(timezone.utc) + timedelta(days=7)
        partner = _make_partner(trial_ends_at=ends_at)

        with patch(
            "app.api.routes.training.dependencies.IntegrationPartner"
        ) as mock_ip:
            mock_ip.find_one = AsyncMock(return_value=partner)
            result = await require_training_admin(user)

        assert result is user

    async def test_expired_trial_with_subscription_passes(self):
        """Org with expired trial date but active subscription passes."""
        from app.api.routes.training.dependencies import require_training_admin

        user = _make_user("admin")
        expired_at = datetime.now(timezone.utc) - timedelta(days=30)
        partner = _make_partner(
            trial_ends_at=expired_at,
            stripe_subscription_id="sub_abc123",
        )

        with patch(
            "app.api.routes.training.dependencies.IntegrationPartner"
        ) as mock_ip:
            mock_ip.find_one = AsyncMock(return_value=partner)
            result = await require_training_admin(user)

        assert result is user

    async def test_no_trial_ends_at_passes(self):
        """Org with trial_ends_at=None (e.g. migrated paid org) passes."""
        from app.api.routes.training.dependencies import require_training_admin

        user = _make_user("admin")
        partner = _make_partner(trial_ends_at=None)

        with patch(
            "app.api.routes.training.dependencies.IntegrationPartner"
        ) as mock_ip:
            mock_ip.find_one = AsyncMock(return_value=partner)
            result = await require_training_admin(user)

        assert result is user

    async def test_non_admin_still_raises_403(self):
        """Viewer role is still rejected before the trial check fires."""
        from fastapi import HTTPException
        from app.api.routes.training.dependencies import require_training_admin

        user = _make_user("viewer")

        with patch(
            "app.api.routes.training.dependencies.IntegrationPartner"
        ) as mock_ip:
            with pytest.raises(HTTPException) as exc_info:
                await require_training_admin(user)
            mock_ip.find_one.assert_not_called()

        assert exc_info.value.status_code == 403

    async def test_partner_not_found_passes(self):
        """If partner record is missing, do not crash — let other guards handle it."""
        from app.api.routes.training.dependencies import require_training_admin

        user = _make_user("admin")

        with patch(
            "app.api.routes.training.dependencies.IntegrationPartner"
        ) as mock_ip:
            mock_ip.find_one = AsyncMock(return_value=None)
            result = await require_training_admin(user)

        assert result is user

    async def test_training_config_none_passes(self):
        """Partner exists but training_config is None — should not crash."""
        from app.api.routes.training.dependencies import require_training_admin

        user = _make_user("admin")
        partner = MagicMock()
        partner.training_config = None

        with patch(
            "app.api.routes.training.dependencies.IntegrationPartner"
        ) as mock_ip:
            mock_ip.find_one = AsyncMock(return_value=partner)
            result = await require_training_admin(user)

        assert result is user
