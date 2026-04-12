"""Tests for the cookie-free YouTube HTML chapter scraper."""
import gzip
from pathlib import Path

import httpx
import pytest
import respx

from app.services.olorin.youtube_chapters_scraper import (
    _extract_duration_seconds,
    _extract_title,
    _parse_blob,
    _parse_timestamp,
    _walk_for_markers,
    fetch_native_chapters_via_html,
)

FIXTURES = Path(__file__).parent / "fixtures"
REAL_HTML_FIXTURE = FIXTURES / "yt_6lSLyERSuh4.html.gz"


def _load_real_html() -> str:
    with gzip.open(REAL_HTML_FIXTURE, "rt", encoding="utf-8") as f:
        return f.read()


def _minimal_html(data_json: str = "{}", player_json: str = "{}") -> str:
    """Build a minimal watch-page HTML for unit tests."""
    return (
        "<html><body>"
        f'<script>var ytInitialPlayerResponse = {player_json};</script>'
        f'<script>var ytInitialData = {data_json};</script>'
        "</body></html>"
    )


class TestParseTimestamp:
    def test_mm_ss(self):
        assert _parse_timestamp("0:00") == 0.0
        assert _parse_timestamp("1:23") == 83.0
        assert _parse_timestamp("59:59") == 3599.0

    def test_hh_mm_ss(self):
        assert _parse_timestamp("1:02:03") == 3723.0

    def test_invalid(self):
        assert _parse_timestamp("abc") is None
        assert _parse_timestamp("") is None
        assert _parse_timestamp("1:2:3:4") is None


class TestWalkForMarkers:
    def test_finds_top_level(self):
        tree = {"macroMarkersListItemRenderer": {"x": 1}}
        assert _walk_for_markers(tree, []) == [{"x": 1}]

    def test_finds_nested_in_lists(self):
        tree = {"items": [{"macroMarkersListItemRenderer": {"i": 1}}, {"y": 2}]}
        assert _walk_for_markers(tree, []) == [{"i": 1}]

    def test_empty_tree_returns_empty(self):
        assert _walk_for_markers({}, []) == []
        assert _walk_for_markers([], []) == []


class TestExtractDurationSeconds:
    def test_top_level_video_details(self):
        blob = {"videoDetails": {"lengthSeconds": "568"}}
        assert _extract_duration_seconds(blob) == 568.0

    def test_nested_video_details(self):
        blob = {"a": {"b": {"videoDetails": {"lengthSeconds": "120"}}}}
        assert _extract_duration_seconds(blob) == 120.0

    def test_missing_returns_zero(self):
        assert _extract_duration_seconds({}) == 0.0
        assert _extract_duration_seconds({"videoDetails": {}}) == 0.0


class TestExtractTitle:
    def test_simple_text(self):
        assert _extract_title({"title": {"simpleText": "Hello"}}) == "Hello"

    def test_runs(self):
        node = {"title": {"runs": [{"text": "Hello "}, {"text": "World"}]}}
        assert _extract_title(node) == "Hello World"

    def test_missing_title(self):
        assert _extract_title({}) is None
        assert _extract_title({"title": "plain"}) is None


class TestParseBlob:
    def test_finds_balanced_object(self):
        html = 'junk var ytInitialData = {"a":1,"b":{"c":2}}; more'
        assert _parse_blob(html, "var ytInitialData") == {"a": 1, "b": {"c": 2}}

    def test_handles_strings_with_braces(self):
        html = 'var ytInitialData = {"s":"}{"};'
        assert _parse_blob(html, "var ytInitialData") == {"s": "}{"}

    def test_missing_marker(self):
        assert _parse_blob("no marker here", "var foo") is None


@pytest.mark.asyncio
async def test_real_fixture_returns_five_chapters():
    """Real 6lSLyERSuh4 fixture must produce the known-good 5-chapter list."""
    html = _load_real_html()
    with respx.mock() as mock:
        mock.get("https://www.youtube.com/watch?v=6lSLyERSuh4").mock(
            return_value=httpx.Response(200, text=html)
        )
        chapters, duration = await fetch_native_chapters_via_html(
            "https://www.youtube.com/watch?v=6lSLyERSuh4"
        )
    assert duration == 282.0
    assert len(chapters) == 5
    titles = [c["title"] for c in chapters]
    starts = [c["start_time"] for c in chapters]
    assert titles == [
        "Intro",
        "Locate the video",
        "Add chapters",
        "Tips",
        "Outro",
    ]
    assert starts == [0.0, 48.0, 70.0, 175.0, 247.0]
    assert chapters[0]["end_time"] == 48.0
    assert chapters[-1]["end_time"] == 282.0


@pytest.mark.asyncio
async def test_video_with_no_markers_returns_empty():
    html = _minimal_html(
        data_json='{"contents":{}}',
        player_json='{"videoDetails":{"lengthSeconds":"568"}}',
    )
    with respx.mock() as mock:
        mock.get("https://www.youtube.com/watch?v=dQw4w9WgXcQ").mock(
            return_value=httpx.Response(200, text=html)
        )
        chapters, duration = await fetch_native_chapters_via_html(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        )
    assert chapters == []
    assert duration == 568.0


@pytest.mark.asyncio
async def test_html_missing_ytinitial_returns_empty():
    with respx.mock() as mock:
        mock.get("https://www.youtube.com/watch?v=abcdefghijk").mock(
            return_value=httpx.Response(200, text="<html>empty</html>")
        )
        chapters, duration = await fetch_native_chapters_via_html(
            "https://www.youtube.com/watch?v=abcdefghijk"
        )
    assert chapters == []
    assert duration == 0.0


@pytest.mark.asyncio
async def test_non_youtube_url_short_circuits_without_http():
    with respx.mock(assert_all_called=False) as mock:
        route = mock.get().mock(return_value=httpx.Response(200, text=""))
        chapters, duration = await fetch_native_chapters_via_html(
            "https://vimeo.com/123456"
        )
    assert chapters == []
    assert duration == 0.0
    assert route.called is False


@pytest.mark.asyncio
async def test_transport_error_propagates():
    with respx.mock() as mock:
        mock.get("https://www.youtube.com/watch?v=abcdefghijk").mock(
            side_effect=httpx.TimeoutException("timeout")
        )
        with pytest.raises(httpx.TimeoutException):
            await fetch_native_chapters_via_html(
                "https://www.youtube.com/watch?v=abcdefghijk"
            )


@pytest.mark.asyncio
async def test_chapters_under_min_count_rejected():
    """Two chapters fail the 3-minimum rule."""
    data = (
        '{"m":[{"macroMarkersListItemRenderer":'
        '{"title":{"simpleText":"A"},"timeDescription":{"simpleText":"0:00"}}},'
        '{"macroMarkersListItemRenderer":'
        '{"title":{"simpleText":"B"},"timeDescription":{"simpleText":"1:00"}}}]}'
    )
    html = _minimal_html(data_json=data, player_json='{"videoDetails":{"lengthSeconds":"300"}}')
    with respx.mock() as mock:
        mock.get("https://www.youtube.com/watch?v=abcdefghijk").mock(
            return_value=httpx.Response(200, text=html)
        )
        chapters, duration = await fetch_native_chapters_via_html(
            "https://www.youtube.com/watch?v=abcdefghijk"
        )
    assert chapters == []
    assert duration == 300.0
