"""Unit tests for the RSS feed BYOC fetcher with respx-mocked HTTP."""

import httpx
import pytest
import respx

from app.services.olorin.fetchers.rss import fetch_rss_feed
from tests.unit.conftest import MockSource

RSS_URL = "http://rss.mock.local/feed.xml"


def _rss_source() -> MockSource:
    return MockSource(
        source_type="rss",
        source_url=RSS_URL,
        name="Test RSS Feed",
    )


VALID_RSS = (
    '<?xml version="1.0"?>'
    '<rss version="2.0">'
    "<channel>"
    "<item>"
    "<title>Video One</title>"
    '<enclosure url="http://example.com/v1.mp4" type="video/mp4"/>'
    "</item>"
    "<item>"
    "<title>Video Two</title>"
    '<enclosure url="http://example.com/v2.mp4" type="video/mp4"/>'
    "</item>"
    "</channel>"
    "</rss>"
)


@respx.mock
@pytest.mark.asyncio
async def test_fetch_rss_returns_content_tuples():
    """RSS fetcher produces (url, title) from video enclosures."""
    source = _rss_source()
    respx.get(RSS_URL).mock(
        return_value=httpx.Response(200, text=VALID_RSS),
    )

    results = await fetch_rss_feed(source)

    assert len(results) == 2
    assert results[0] == ("http://example.com/v1.mp4", "Video One")
    assert results[1] == ("http://example.com/v2.mp4", "Video Two")


@respx.mock
@pytest.mark.asyncio
async def test_fetch_rss_media_content_fallback():
    """RSS fetcher extracts from media:content when no enclosure."""
    source = _rss_source()
    xml = (
        '<?xml version="1.0"?>'
        '<rss version="2.0" '
        'xmlns:media="http://search.yahoo.com/mrss/">'
        "<channel>"
        "<item>"
        "<title>Media Video</title>"
        '<media:content url="http://example.com/m.mp4" '
        'type="video/mp4"/>'
        "</item>"
        "</channel>"
        "</rss>"
    )
    respx.get(RSS_URL).mock(
        return_value=httpx.Response(200, text=xml),
    )

    results = await fetch_rss_feed(source)

    assert len(results) == 1
    assert results[0] == ("http://example.com/m.mp4", "Media Video")


@respx.mock
@pytest.mark.asyncio
async def test_fetch_rss_empty_on_connection_error():
    """RSS fetcher returns empty list when server returns 500."""
    source = _rss_source()
    respx.get(RSS_URL).mock(
        return_value=httpx.Response(500),
    )

    results = await fetch_rss_feed(source)

    assert results == []


@respx.mock
@pytest.mark.asyncio
async def test_fetch_rss_empty_on_invalid_xml():
    """RSS fetcher returns empty list on malformed XML."""
    source = _rss_source()
    respx.get(RSS_URL).mock(
        return_value=httpx.Response(200, text="not xml at all"),
    )

    results = await fetch_rss_feed(source)

    assert results == []
