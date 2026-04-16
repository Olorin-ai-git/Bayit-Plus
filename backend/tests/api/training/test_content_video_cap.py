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


def _mock_find_sort_to_list(return_value):
    """Build a mock chain: find(...).sort(...).to_list() -> return_value."""
    chain = MagicMock()
    chain.sort.return_value.to_list = AsyncMock(return_value=return_value)
    return chain


@pytest.mark.asyncio
async def test_list_content_includes_monthly_quota_for_team():
    """Team tier admin sees video_quota with monthly period and correct count."""
    admin = _make_admin()

    # Content.find is called twice:
    # 1) Content.find(query).sort("-_id").to_list() -> content items
    # 2) Content.find(monthly_query).count() -> monthly count
    sortable = _mock_find_sort_to_list([])

    countable = MagicMock()
    countable.count = AsyncMock(return_value=7)

    content_find_mock = MagicMock(side_effect=[sortable, countable])
    ingest_chain = _mock_find_sort_to_list([])

    with (
        patch(f"{_CONTENT}.Content") as MockContent,
        patch(f"{_CONTENT}.IngestJob") as MockIngest,
        patch(f"{_CONTENT}.VideoChapters") as MockVC,
        patch(f"{_CONTENT}.resolve_partner_tier", new_callable=AsyncMock, return_value="team"),
        patch(f"{_CONTENT}.get_current_training_user", return_value=admin),
    ):
        MockContent.find = content_find_mock
        MockIngest.find = MagicMock(return_value=ingest_chain)
        MockVC.get_for_content = AsyncMock(return_value=None)

        from app.api.routes.training.content import list_content

        result = await list_content(user=admin)

    assert result["video_quota"] is not None
    assert result["video_quota"]["used"] == 7
    assert result["video_quota"]["limit"] == 20
    assert result["video_quota"]["period"] == "monthly"


@pytest.mark.asyncio
async def test_list_content_no_quota_for_organization():
    """Organization tier has no cap -- video_quota should be None."""
    admin = _make_admin()

    content_chain = _mock_find_sort_to_list([])
    ingest_chain = _mock_find_sort_to_list([])

    with (
        patch(f"{_CONTENT}.Content") as MockContent,
        patch(f"{_CONTENT}.IngestJob") as MockIngest,
        patch(f"{_CONTENT}.VideoChapters") as MockVC,
        patch(f"{_CONTENT}.resolve_partner_tier", new_callable=AsyncMock, return_value="organization"),
        patch(f"{_CONTENT}.get_current_training_user", return_value=admin),
    ):
        MockContent.find = MagicMock(return_value=content_chain)
        MockIngest.find = MagicMock(return_value=ingest_chain)
        MockVC.get_for_content = AsyncMock(return_value=None)

        from app.api.routes.training.content import list_content

        result = await list_content(user=admin)

    assert result["video_quota"] is None
