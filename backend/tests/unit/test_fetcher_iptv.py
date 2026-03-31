"""Unit tests for the IPTV M3U fetcher with respx-mocked HTTP."""

import httpx
import pytest
import respx

from app.services.olorin.fetchers.iptv import fetch_iptv
from tests.unit.conftest import MockSource


IPTV_URL = "http://iptv.mock.local/playlist.m3u"


def _iptv_source() -> MockSource:
    return MockSource(
        source_type="iptv",
        source_url=IPTV_URL,
        name="Test IPTV Playlist",
    )


VALID_M3U = (
    "#EXTM3U\n"
    '#EXTINF:-1 tvg-name="Ch1",Test Channel One\n'
    "http://stream.test.local/ch1.ts\n"
    '#EXTINF:-1 tvg-name="Ch2",Test Channel Two\n'
    "http://stream.test.local/ch2.ts\n"
)


@respx.mock
@pytest.mark.asyncio
async def test_fetch_iptv_returns_content_tuples():
    """IPTV fetcher produces (url, title) tuples from M3U entries."""
    source = _iptv_source()
    respx.get(IPTV_URL).mock(
        return_value=httpx.Response(200, text=VALID_M3U),
    )

    results = await fetch_iptv(source)

    assert len(results) == 2
    assert results[0] == (
        "http://stream.test.local/ch1.ts", "Test Channel One",
    )
    assert results[1] == (
        "http://stream.test.local/ch2.ts", "Test Channel Two",
    )


@respx.mock
@pytest.mark.asyncio
async def test_fetch_iptv_empty_on_connection_error():
    """IPTV fetcher returns empty list when server returns 500."""
    source = _iptv_source()
    respx.get(IPTV_URL).mock(
        return_value=httpx.Response(500),
    )

    results = await fetch_iptv(source)

    assert results == []


@respx.mock
@pytest.mark.asyncio
async def test_fetch_iptv_empty_on_malformed_m3u():
    """IPTV fetcher returns empty list for M3U with no EXTINF lines."""
    source = _iptv_source()
    respx.get(IPTV_URL).mock(
        return_value=httpx.Response(200, text="#EXTM3U\n"),
    )

    results = await fetch_iptv(source)

    assert results == []
