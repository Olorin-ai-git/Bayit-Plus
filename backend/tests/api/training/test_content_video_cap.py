"""Tests for video cap enforcement in content ingestion."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.routes.training.content import (
    MONTHLY_VIDEO_LIMITS,
    TOTAL_VIDEO_LIMITS,
)


_CONTENT = "app.api.routes.training.content"


def _make_admin(partner_id="test-partner"):
    user = MagicMock()
    user.id = "user-1"
    user.partner_id = partner_id
    user.role = "admin"
    user.status = "active"
    user.email = "admin@example.com"
    user.display_name = "Admin"
    return user


def _make_body():
    body = MagicMock()
    body.video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    body.title = "Test Video"
    body.description = ""
    body.tags = []
    body.capabilities = ["characters", "subtitles"]
    return body


def test_team_limit_is_20_monthly():
    assert MONTHLY_VIDEO_LIMITS["team"] == 20


def test_free_limit_is_3_total():
    assert TOTAL_VIDEO_LIMITS["free"] == 3


@pytest.mark.asyncio
async def test_team_tier_counts_only_current_month():
    """Team tier at 20 videos this month should get 402 with created_at filter."""
    admin = _make_admin()
    body = _make_body()
    bg = MagicMock()

    mock_partner = MagicMock()
    mock_partner.partner_id = "test-partner"

    count_mock = AsyncMock(return_value=20)
    find_mock = MagicMock()
    find_mock.return_value.count = count_mock

    with (
        patch(f"{_CONTENT}.validate_video_url", return_value=(True, None)),
        patch(f"{_CONTENT}.IntegrationPartner") as MockIP,
        patch(f"{_CONTENT}.resolve_partner_tier", new_callable=AsyncMock, return_value="team"),
        patch(f"{_CONTENT}.Content") as MockContent,
    ):
        MockIP.find_one = AsyncMock(return_value=mock_partner)
        MockContent.find = find_mock

        from app.api.routes.training.content import ingest_content

        with pytest.raises(HTTPException) as exc:
            await ingest_content(body=body, background_tasks=bg, admin=admin)
        assert exc.value.status_code == 402

        find_call_args = find_mock.call_args[0][0]
        assert "created_at" in find_call_args
        assert "$gte" in find_call_args["created_at"]
        gte_val = find_call_args["created_at"]["$gte"]
        assert isinstance(gte_val, datetime)
        assert gte_val.day == 1
        assert gte_val.tzinfo == timezone.utc


@pytest.mark.asyncio
async def test_free_tier_uses_total_count():
    """Free tier at 3 videos should get 402 without created_at filter."""
    admin = _make_admin()
    body = _make_body()
    bg = MagicMock()

    mock_partner = MagicMock()
    mock_partner.partner_id = "test-partner"

    count_mock = AsyncMock(return_value=3)
    find_mock = MagicMock()
    find_mock.return_value.count = count_mock

    with (
        patch(f"{_CONTENT}.validate_video_url", return_value=(True, None)),
        patch(f"{_CONTENT}.IntegrationPartner") as MockIP,
        patch(f"{_CONTENT}.resolve_partner_tier", new_callable=AsyncMock, return_value="free"),
        patch(f"{_CONTENT}.Content") as MockContent,
    ):
        MockIP.find_one = AsyncMock(return_value=mock_partner)
        MockContent.find = find_mock

        from app.api.routes.training.content import ingest_content

        with pytest.raises(HTTPException) as exc:
            await ingest_content(body=body, background_tasks=bg, admin=admin)
        assert exc.value.status_code == 402

        find_call_args = find_mock.call_args[0][0]
        assert "created_at" not in find_call_args
        assert find_call_args["partner_id"] == "test-partner"
