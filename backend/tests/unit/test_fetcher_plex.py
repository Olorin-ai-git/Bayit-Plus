"""Unit tests for the Plex BYOC fetcher with respx-mocked HTTP."""

import httpx
import pytest
import respx

from app.services.olorin.fetchers.plex import fetch_plex
from tests.unit.conftest import MockSource


PLEX_BASE = "http://plex.mock.local:32400"
PLEX_TOKEN = "test-plex-token-abc123"


def _plex_source(token: str = PLEX_TOKEN) -> MockSource:
    url = f"{PLEX_BASE}?X-Plex-Token={token}" if token else PLEX_BASE
    return MockSource(
        source_type="plex",
        source_url=url,
        name="Test Plex Server",
    )


@respx.mock
@pytest.mark.asyncio
async def test_fetch_plex_returns_content_tuples():
    """Plex fetcher produces (url, title) tuples from library items."""
    source = _plex_source()
    respx.get(f"{PLEX_BASE}/library/sections").mock(
        return_value=httpx.Response(200, json={
            "MediaContainer": {
                "Directory": [
                    {"key": "1", "type": "movie", "title": "Movies"},
                ],
            },
        }),
    )
    respx.get(f"{PLEX_BASE}/library/sections/1/all").mock(
        return_value=httpx.Response(200, json={
            "MediaContainer": {
                "Metadata": [
                    {"ratingKey": "101", "title": "Test Movie"},
                    {"ratingKey": "102", "title": "Another Movie"},
                ],
            },
        }),
    )

    results = await fetch_plex(source)

    assert len(results) == 2
    assert results[0] == (
        f"{PLEX_BASE}/library/metadata/101", "Test Movie",
    )
    assert results[1] == (
        f"{PLEX_BASE}/library/metadata/102", "Another Movie",
    )


@respx.mock
@pytest.mark.asyncio
async def test_fetch_plex_skips_non_video_sections():
    """Plex fetcher ignores music/photo library sections."""
    source = _plex_source()
    respx.get(f"{PLEX_BASE}/library/sections").mock(
        return_value=httpx.Response(200, json={
            "MediaContainer": {
                "Directory": [
                    {"key": "2", "type": "artist", "title": "Music"},
                ],
            },
        }),
    )

    results = await fetch_plex(source)

    assert results == []


@respx.mock
@pytest.mark.asyncio
async def test_fetch_plex_empty_on_connection_error():
    """Plex fetcher returns empty list when server returns 500."""
    source = _plex_source()
    respx.get(f"{PLEX_BASE}/library/sections").mock(
        return_value=httpx.Response(500),
    )

    results = await fetch_plex(source)

    assert results == []


@pytest.mark.asyncio
async def test_fetch_plex_empty_on_missing_token():
    """Plex fetcher returns empty list when X-Plex-Token is absent."""
    source = _plex_source(token="")

    results = await fetch_plex(source)

    assert results == []
