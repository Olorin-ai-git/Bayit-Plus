"""Tests for training credit limit enforcement.

Video ingest and BYOC import are FREE (gated by per-tier duration limits
in the ingest orchestrator). Credit deduction applies only to AI-consuming
features (companion, search, pause-ask, etc.) via deduct_training_credits.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

pytest_plugins = ["conftest_training"]

pytestmark = pytest.mark.asyncio


class TestIngestNoCreditGate:
    """POST /api/v1/training/content/ingest should NOT check credits."""

    async def test_ingest_allowed_regardless_of_credit_balance(
        self, training_admin_client
    ):
        """Ingest proceeds even when credits are exhausted (free operation)."""
        mock_partner = MagicMock()
        mock_partner.partner_id = "training-testorg-abc12345"
        mock_partner.training_config = {
            "credit_limit_monthly": 50,
            "credits_used": 50,
        }
        mock_partner.save = AsyncMock()

        mock_content = MagicMock()
        mock_content.id = "content_123"
        mock_content.insert = AsyncMock()

        mock_job = MagicMock()
        mock_job.job_id = "job_123"
        mock_job.overall_status = "pending"
        mock_job.capabilities = {}

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
            mock_ip.find_one = AsyncMock(return_value=mock_partner)

            resp = await training_admin_client.post(
                "/api/v1/training/content/ingest",
                json={
                    "video_url": "https://www.youtube.com/watch?v=test123",
                    "title": "Test Video",
                    "capabilities": ["characters"],
                },
            )

        assert resp.status_code == 202

    async def test_ingest_does_not_increment_credits(
        self, training_admin_client
    ):
        """Ingest should not touch credits_used (free operation)."""
        mock_partner = MagicMock()
        mock_partner.partner_id = "training-testorg-abc12345"
        mock_partner.training_config = {
            "credit_limit_monthly": 50,
            "credits_used": 5,
        }
        mock_partner.save = AsyncMock()

        mock_content = MagicMock()
        mock_content.id = "content_456"
        mock_content.insert = AsyncMock()

        mock_job = MagicMock()
        mock_job.job_id = "job_456"
        mock_job.overall_status = "pending"
        mock_job.capabilities = {}

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
            mock_ip.find_one = AsyncMock(return_value=mock_partner)

            resp = await training_admin_client.post(
                "/api/v1/training/content/ingest",
                json={
                    "video_url": "https://www.youtube.com/watch?v=test456",
                    "title": "Another Video",
                    "capabilities": ["subtitles"],
                },
            )

        assert resp.status_code == 202
        # find_one should only be called once (partner lookup), no update call
        mock_ip.find_one.assert_awaited_once()
