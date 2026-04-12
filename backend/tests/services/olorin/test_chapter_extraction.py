"""Tests for ChapterExtractionService routing logic."""
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.chapter_generator import ChapterItem, GeneratedChapters


def _fake_generated(chapters_count: int, source: str) -> GeneratedChapters:
    chapters = [
        ChapterItem(
            start_time=float(i * 60),
            end_time=float((i + 1) * 60),
            title=f"Chapter {i}",
            title_en=f"Chapter {i}",
            category="general",
        )
        for i in range(chapters_count)
    ]
    return GeneratedChapters(
        chapters=chapters,
        content_id="c1",
        content_title="t",
        total_duration=float(chapters_count * 60),
        source=source,
    )


def _patch_html_empty():
    return patch(
        "app.services.olorin.chapter_extraction.fetch_native_chapters_via_html",
        new=AsyncMock(return_value=([], 0.0)),
    )


@pytest.mark.asyncio
async def test_native_chapters_used_when_present():
    from app.services.olorin.chapter_extraction import ChapterExtractionService

    native = (
        [
            {"start_time": 0.0, "end_time": 30.0, "title": "Intro"},
            {"start_time": 30.0, "end_time": 90.0, "title": "Body"},
        ],
        90.0,
    )
    persisted = MagicMock()

    with (
        _patch_html_empty(),
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_ytdlp",
            new=AsyncMock(return_value=native),
        ),
        patch(
            "app.services.olorin.chapter_extraction.VideoChapters.create_or_update",
            new=AsyncMock(return_value=persisted),
        ),
        patch(
            "app.services.olorin.chapter_extraction.generate_chapters_from_transcript_generic",
            new=AsyncMock(side_effect=AssertionError("AI must not be called")),
        ),
    ):
        svc = ChapterExtractionService()
        source, count = await svc.extract(
            content_id="c1",
            content_title="Test",
            video_url="https://youtu.be/abc",
            transcript="any",
            duration_hint=90.0,
        )

    assert source == "youtube_native"
    assert count == 2


@pytest.mark.asyncio
async def test_falls_back_to_ai_when_native_empty():
    from app.services.olorin.chapter_extraction import ChapterExtractionService

    with (
        _patch_html_empty(),
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_ytdlp",
            new=AsyncMock(return_value=([], 360.0)),
        ),
        patch(
            "app.services.olorin.chapter_extraction.generate_chapters_from_transcript_generic",
            new=AsyncMock(return_value=_fake_generated(4, "ai_transcript")),
        ),
        patch(
            "app.services.olorin.chapter_extraction.VideoChapters.create_or_update",
            new=AsyncMock(return_value=MagicMock()),
        ),
    ):
        svc = ChapterExtractionService()
        source, count = await svc.extract(
            content_id="c1",
            content_title="Test",
            video_url="https://youtu.be/abc",
            transcript="lorem ipsum",
            duration_hint=360.0,
        )

    assert source == "ai_transcript"
    assert count == 4


@pytest.mark.asyncio
async def test_falls_back_to_ai_when_native_probe_raises():
    """yt-dlp failure (cookies expired, network) must not block — degrade to AI."""
    from app.services.olorin.chapter_extraction import ChapterExtractionService

    with (
        _patch_html_empty(),
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_ytdlp",
            new=AsyncMock(side_effect=RuntimeError("yt-dlp: Sign in to confirm")),
        ),
        patch(
            "app.services.olorin.chapter_extraction.generate_chapters_from_transcript_generic",
            new=AsyncMock(return_value=_fake_generated(3, "ai_transcript")),
        ),
        patch(
            "app.services.olorin.chapter_extraction.VideoChapters.create_or_update",
            new=AsyncMock(return_value=MagicMock()),
        ),
    ):
        svc = ChapterExtractionService()
        source, count = await svc.extract(
            content_id="c1",
            content_title="Test",
            video_url="https://youtu.be/abc",
            transcript="x",
            duration_hint=180.0,
        )

    assert source == "ai_transcript"
    assert count == 3


@pytest.mark.asyncio
async def test_returns_zero_when_ai_also_fails():
    from app.services.olorin.chapter_extraction import ChapterExtractionService

    with (
        _patch_html_empty(),
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_ytdlp",
            new=AsyncMock(return_value=([], 180.0)),
        ),
        patch(
            "app.services.olorin.chapter_extraction.generate_chapters_from_transcript_generic",
            new=AsyncMock(return_value=_fake_generated(0, "ai_failed")),
        ),
        patch(
            "app.services.olorin.chapter_extraction.VideoChapters.create_or_update",
            new=AsyncMock(return_value=MagicMock()),
        ),
    ):
        svc = ChapterExtractionService()
        source, count = await svc.extract(
            content_id="c1",
            content_title="Test",
            video_url="https://youtu.be/abc",
            transcript="x",
            duration_hint=180.0,
        )

    assert source == "ai_failed"
    assert count == 0


@pytest.mark.asyncio
async def test_html_scrape_tried_first_for_youtube_urls():
    """When HTML scrape returns chapters, yt-dlp must not be called."""
    from app.services.olorin.chapter_extraction import ChapterExtractionService

    native = (
        [
            {"start_time": 0.0, "end_time": 30.0, "title": "A"},
            {"start_time": 30.0, "end_time": 90.0, "title": "B"},
        ],
        90.0,
    )
    scraper_mock = AsyncMock(return_value=native)
    ytdlp_mock = AsyncMock(side_effect=AssertionError("yt-dlp must not run"))

    with (
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_html",
            new=scraper_mock,
        ),
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_ytdlp",
            new=ytdlp_mock,
        ),
        patch(
            "app.services.olorin.chapter_extraction.VideoChapters.create_or_update",
            new=AsyncMock(return_value=MagicMock()),
        ),
    ):
        svc = ChapterExtractionService()
        source, count = await svc.extract(
            content_id="c1",
            content_title="Test",
            video_url="https://www.youtube.com/watch?v=6lSLyERSuh4",
            transcript="ignored",
            duration_hint=90.0,
        )

    assert source == "youtube_native"
    assert count == 2
    scraper_mock.assert_awaited_once()
    ytdlp_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_html_scrape_empty_falls_through_to_ytdlp():
    from app.services.olorin.chapter_extraction import ChapterExtractionService

    scraper_mock = AsyncMock(return_value=([], 300.0))
    ytdlp_mock = AsyncMock(
        return_value=(
            [
                {"start_time": 0.0, "end_time": 60.0, "title": "A"},
                {"start_time": 60.0, "end_time": 300.0, "title": "B"},
            ],
            300.0,
        )
    )

    with (
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_html",
            new=scraper_mock,
        ),
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_ytdlp",
            new=ytdlp_mock,
        ),
        patch(
            "app.services.olorin.chapter_extraction.VideoChapters.create_or_update",
            new=AsyncMock(return_value=MagicMock()),
        ),
    ):
        svc = ChapterExtractionService()
        source, count = await svc.extract(
            content_id="c1",
            content_title="Test",
            video_url="https://youtu.be/abc",
            transcript="x",
            duration_hint=300.0,
        )

    assert source == "youtube_native"
    assert count == 2
    scraper_mock.assert_awaited_once()
    ytdlp_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_html_scrape_raises_falls_through_to_ytdlp():
    from app.services.olorin.chapter_extraction import ChapterExtractionService

    scraper_mock = AsyncMock(side_effect=httpx.TimeoutException("timeout"))
    ytdlp_mock = AsyncMock(return_value=([], 0.0))

    with (
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_html",
            new=scraper_mock,
        ),
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_ytdlp",
            new=ytdlp_mock,
        ),
        patch(
            "app.services.olorin.chapter_extraction.generate_chapters_from_transcript_generic",
            new=AsyncMock(side_effect=AssertionError("no transcript, AI not called")),
        ),
    ):
        svc = ChapterExtractionService()
        source, count = await svc.extract(
            content_id="c1",
            content_title="Test",
            video_url="https://youtu.be/abc",
            transcript="",
            duration_hint=100.0,
        )

    assert source == "ai_failed"
    assert count == 0
    scraper_mock.assert_awaited_once()
    ytdlp_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_html_scrape_skipped_for_non_youtube_urls():
    from app.services.olorin.chapter_extraction import ChapterExtractionService

    scraper_mock = AsyncMock(side_effect=AssertionError("scraper must not run"))
    ytdlp_mock = AsyncMock(
        return_value=(
            [
                {"start_time": 0.0, "end_time": 60.0, "title": "A"},
                {"start_time": 60.0, "end_time": 120.0, "title": "B"},
            ],
            120.0,
        )
    )

    with (
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_html",
            new=scraper_mock,
        ),
        patch(
            "app.services.olorin.chapter_extraction.fetch_native_chapters_via_ytdlp",
            new=ytdlp_mock,
        ),
        patch(
            "app.services.olorin.chapter_extraction.VideoChapters.create_or_update",
            new=AsyncMock(return_value=MagicMock()),
        ),
    ):
        svc = ChapterExtractionService()
        source, count = await svc.extract(
            content_id="c1",
            content_title="Test",
            video_url="https://vimeo.com/12345",
            transcript="x",
            duration_hint=120.0,
        )

    assert source == "youtube_native"
    assert count == 2
    scraper_mock.assert_not_awaited()
    ytdlp_mock.assert_awaited_once()
