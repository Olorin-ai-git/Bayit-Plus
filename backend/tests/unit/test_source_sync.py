"""Tests for source sync service (Phase H2)."""

import pytest
from xml.etree import ElementTree

from app.services.olorin.source_sync import (
    _FETCHERS,
    _fetch_rss_feed,
    _resolve_youtube_channel_id,
)


class TestFetcherRegistry:
    """All source types have registered fetchers."""

    def test_youtube_channel_fetcher(self):
        assert "youtube_channel" in _FETCHERS
        assert callable(_FETCHERS["youtube_channel"])

    def test_playlist_fetcher(self):
        assert "playlist" in _FETCHERS
        assert callable(_FETCHERS["playlist"])

    def test_rss_fetcher(self):
        assert "rss" in _FETCHERS
        assert callable(_FETCHERS["rss"])

    def test_manual_fetcher(self):
        assert "manual" in _FETCHERS
        assert callable(_FETCHERS["manual"])

    def test_all_four_types(self):
        assert len(_FETCHERS) == 4


class TestResolveYouTubeChannelId:
    """Channel ID extraction from various YouTube URL formats."""

    @pytest.mark.asyncio
    async def test_direct_channel_id(self):
        result = await _resolve_youtube_channel_id(
            "https://www.youtube.com/channel/UCxxxxxxxx",
            "fake-key",
        )
        assert result == "UCxxxxxxxx"

    @pytest.mark.asyncio
    async def test_channel_path_with_trailing_slash(self):
        result = await _resolve_youtube_channel_id(
            "https://www.youtube.com/channel/UC12345/",
            "fake-key",
        )
        assert result == "UC12345"


class TestRssParsing:
    """RSS XML parsing for video enclosures."""

    def test_rss_xml_with_enclosure(self):
        xml = """<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Test Video</title>
              <enclosure url="https://example.com/v.mp4"
                         type="video/mp4" length="1024"/>
            </item>
          </channel>
        </rss>"""
        root = ElementTree.fromstring(xml)
        items = list(root.iter("item"))
        assert len(items) == 1
        enc = items[0].find("enclosure")
        assert enc is not None
        assert enc.get("url") == "https://example.com/v.mp4"
        assert "video" in enc.get("type", "")

    def test_rss_xml_with_media_content(self):
        xml = """<?xml version="1.0"?>
        <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
          <channel>
            <item>
              <title>Media Video</title>
              <media:content url="https://example.com/m.mp4"
                             type="video/mp4"/>
            </item>
          </channel>
        </rss>"""
        root = ElementTree.fromstring(xml)
        ns = {"media": "http://search.yahoo.com/mrss/"}
        items = list(root.iter("item"))
        media = items[0].find("media:content", ns)
        assert media is not None
        assert media.get("url") == "https://example.com/m.mp4"

    def test_rss_xml_with_link_fallback(self):
        xml = """<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Link Video</title>
              <link>https://example.com/video.mp4</link>
            </item>
          </channel>
        </rss>"""
        root = ElementTree.fromstring(xml)
        items = list(root.iter("item"))
        link = items[0].find("link")
        assert link is not None
        assert link.text.strip().endswith(".mp4")
