"""Tier quota checks: per-file, total storage, URL hourly rate."""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.services.training.document_quota import (
    QuotaExceededError,
    check_per_file_size,
    check_total_storage,
    check_url_rate,
)


def test_per_file_size_org_tier_accepts_25mb():
    check_per_file_size(size_bytes=25 * 1024 * 1024, tier="organization")


def test_per_file_size_org_tier_rejects_26mb():
    with pytest.raises(QuotaExceededError):
        check_per_file_size(size_bytes=26 * 1024 * 1024, tier="organization")


def test_per_file_size_enterprise_accepts_100mb():
    check_per_file_size(size_bytes=100 * 1024 * 1024, tier="enterprise")


def test_per_file_size_team_blocked():
    with pytest.raises(QuotaExceededError):
        check_per_file_size(size_bytes=1, tier="team")


@pytest.mark.asyncio
async def test_total_storage_sums_existing_and_adds_new():
    with patch(
        "app.services.training.document_quota._sum_partner_doc_bytes",
        new=AsyncMock(return_value=1023 * 1024 * 1024),
    ):
        await check_total_storage(
            partner_id="p1", tier="organization",
            additional_bytes=1 * 1024 * 1024,
        )
        with pytest.raises(QuotaExceededError):
            await check_total_storage(
                partner_id="p1", tier="organization",
                additional_bytes=2 * 1024 * 1024,
            )


@pytest.mark.asyncio
async def test_url_rate_org_tier_10_per_hour():
    with patch(
        "app.services.training.document_quota._count_recent_url_ingests",
        new=AsyncMock(return_value=10),
    ):
        with pytest.raises(QuotaExceededError):
            await check_url_rate(partner_id="p1", tier="organization")

    with patch(
        "app.services.training.document_quota._count_recent_url_ingests",
        new=AsyncMock(return_value=9),
    ):
        await check_url_rate(partner_id="p1", tier="organization")
