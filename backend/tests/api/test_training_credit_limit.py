"""Tests for training credit limit enforcement."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

pytest_plugins = ["conftest_training"]

pytestmark = pytest.mark.asyncio


class TestCreditLimitEnforcement:
    """POST /api/v1/training/content/ingest should check credits."""

    async def test_ingest_rejected_when_credits_exhausted(
        self, training_admin_client
    ):
        """Ingest should return 402 when credits are used up."""
        mock_partner = MagicMock()
        mock_partner.training_config = {
            "credit_limit_monthly": 50,
            "credits_used": 50,
        }

        with patch(
            "app.api.routes.training.content.IntegrationPartner"
        ) as mock_ip:
            mock_ip.find_one = AsyncMock(return_value=mock_partner)

            resp = await training_admin_client.post(
                "/api/v1/training/content/ingest",
                json={
                    "video_url": "https://www.youtube.com/watch?v=test123",
                    "title": "Test Video",
                    "capabilities": ["characters"],
                },
            )

        assert resp.status_code == 402
        assert "credit" in resp.json()["detail"].lower()

    async def test_ingest_allowed_when_credits_available(
        self, training_admin_client
    ):
        """Ingest should proceed when credits are available."""
        mock_partner = MagicMock()
        mock_partner.partner_id = "training-testorg-abc12345"
        mock_partner.training_config = {
            "credit_limit_monthly": 50,
            "credits_used": 10,
        }
        mock_partner.save = AsyncMock()

        mock_content = MagicMock()
        mock_content.id = "content_123"
        mock_content.insert = AsyncMock()

        mock_job = MagicMock()
        mock_job.job_id = "job_123"
        mock_job.overall_status = "pending"
        mock_job.capabilities = {}

        # find_one is used in two patterns:
        #   1. await find_one(...)           → returns mock_partner
        #   2. find_one(...).update(...)     → returns an awaitable
        # A plain AsyncMock only handles pattern 1 (returns a coroutine when called,
        # which has no .update attribute). This proxy handles both.
        class _FindOneProxy:
            def __init__(self, val: MagicMock) -> None:
                self._val = val
                self.update = AsyncMock()

            def __await__(self):  # type: ignore[override]
                async def _inner() -> MagicMock:
                    return self._val
                return _inner().__await__()

        find_proxy = _FindOneProxy(mock_partner)

        with (
            patch(
                "app.api.routes.training.content.IntegrationPartner"
            ) as mock_ip,
            patch(
                "app.api.routes.training.content.Content",
                return_value=mock_content,
            ),
            patch(
                "app.api.routes.training.content.validate_video_url",
                return_value=(True, ""),
            ),
            patch(
                "app.api.routes.training.content.create_ingest_job",
                new_callable=AsyncMock,
                return_value=mock_job,
            ),
            patch(
                "app.api.routes.training.content.run_pipeline",
                new_callable=AsyncMock,
            ),
        ):
            mock_ip.find_one = MagicMock(return_value=find_proxy)

            resp = await training_admin_client.post(
                "/api/v1/training/content/ingest",
                json={
                    "video_url": "https://www.youtube.com/watch?v=test123",
                    "title": "Test Video",
                    "capabilities": ["characters"],
                },
            )

        assert resp.status_code == 202
