"""Unit tests for the YouTube BYOC fetcher with respx-mocked HTTP."""

from unittest.mock import patch

import httpx
import pytest
import respx

from app.services.olorin.fetchers.youtube import (
    fetch_youtube_channel,
    fetch_youtube_playlist,
)
from tests.unit.conftest import MockSource

YT_API = "https://www.googleapis.com/youtube/v3"


def _channel_source() -> MockSource:
    return MockSource(
        source_type="youtube_channel",
        source_url="https://www.youtube.com/@TestChannel",
        name="Test YouTube Channel",
    )


def _playlist_source() -> MockSource:
    return MockSource(
        source_type="playlist",
        source_url="https://www.youtube.com/playlist?list=PLtest123",
        name="Test Playlist",
    )


@respx.mock
@pytest.mark.asyncio
@patch("app.services.olorin.fetchers.youtube.settings")
async def test_fetch_youtube_channel_returns_content_tuples(
    mock_settings,
):
    """YouTube channel fetcher produces (url, title) tuples."""
    mock_settings.YOUTUBE_API_KEY = "test-yt-key"
    source = _channel_source()

    respx.get(f"{YT_API}/channels").mock(
        return_value=httpx.Response(200, json={
            "items": [{"id": "UC_test_channel_id"}],
        }),
    )
    respx.get(f"{YT_API}/search").mock(
        return_value=httpx.Response(200, json={
            "items": [
                {
                    "id": {"videoId": "vid_001"},
                    "snippet": {"title": "First Video"},
                },
                {
                    "id": {"videoId": "vid_002"},
                    "snippet": {"title": "Second Video"},
                },
            ],
        }),
    )

    results = await fetch_youtube_channel(source)

    assert len(results) == 2
    assert results[0] == (
        "https://www.youtube.com/watch?v=vid_001", "First Video",
    )
    assert results[1] == (
        "https://www.youtube.com/watch?v=vid_002", "Second Video",
    )


@pytest.mark.asyncio
@patch("app.services.olorin.fetchers.youtube.settings")
async def test_fetch_youtube_channel_empty_on_no_api_key(
    mock_settings,
):
    """YouTube channel fetcher returns [] when API key is missing."""
    mock_settings.YOUTUBE_API_KEY = ""
    source = _channel_source()

    results = await fetch_youtube_channel(source)

    assert results == []


@respx.mock
@pytest.mark.asyncio
@patch("app.services.olorin.fetchers.youtube.settings")
async def test_fetch_youtube_playlist_returns_content_tuples(
    mock_settings,
):
    """YouTube playlist fetcher produces (url, title) tuples."""
    mock_settings.YOUTUBE_API_KEY = "test-yt-key"
    source = _playlist_source()

    respx.get(f"{YT_API}/playlistItems").mock(
        return_value=httpx.Response(200, json={
            "items": [
                {
                    "snippet": {
                        "title": "Playlist Vid 1",
                        "resourceId": {"videoId": "pl_vid_1"},
                    },
                },
            ],
        }),
    )

    results = await fetch_youtube_playlist(source)

    assert len(results) == 1
    assert results[0] == (
        "https://www.youtube.com/watch?v=pl_vid_1",
        "Playlist Vid 1",
    )
