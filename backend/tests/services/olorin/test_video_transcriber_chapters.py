"""Tests for fetch_native_chapters_via_ytdlp."""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_fetch_native_chapters_returns_parsed_list():
    from app.services.olorin.video_transcriber import (
        fetch_native_chapters_via_ytdlp,
    )

    fake_json = json.dumps({
        "chapters": [
            {"start_time": 0.0, "end_time": 60.0, "title": "Intro"},
            {"start_time": 60.0, "end_time": 180.0, "title": "Setup"},
        ],
        "duration": 180,
    }).encode()

    proc = MagicMock()
    proc.returncode = 0
    proc.communicate = AsyncMock(return_value=(fake_json, b""))

    with (
        patch(
            "app.services.olorin.video_transcriber.asyncio.create_subprocess_exec",
            new=AsyncMock(return_value=proc),
        ),
        patch(
            "app.services.olorin.video_transcriber.settings"
        ) as mock_settings,
    ):
        mock_settings.YTDLP_COOKIES_FILE = ""
        chapters, duration = await fetch_native_chapters_via_ytdlp(
            "https://youtu.be/abc",
        )

    assert duration == 180.0
    assert len(chapters) == 2
    assert chapters[0]["title"] == "Intro"
    assert chapters[0]["start_time"] == 0.0
    assert chapters[0]["end_time"] == 60.0


@pytest.mark.asyncio
async def test_fetch_native_chapters_returns_empty_when_no_chapters():
    from app.services.olorin.video_transcriber import (
        fetch_native_chapters_via_ytdlp,
    )

    proc = MagicMock()
    proc.returncode = 0
    proc.communicate = AsyncMock(
        return_value=(json.dumps({"duration": 600}).encode(), b""),
    )

    with (
        patch(
            "app.services.olorin.video_transcriber.asyncio.create_subprocess_exec",
            new=AsyncMock(return_value=proc),
        ),
        patch(
            "app.services.olorin.video_transcriber.settings"
        ) as mock_settings,
    ):
        mock_settings.YTDLP_COOKIES_FILE = ""
        chapters, duration = await fetch_native_chapters_via_ytdlp(
            "https://youtu.be/abc",
        )

    assert chapters == []
    assert duration == 600.0


@pytest.mark.asyncio
async def test_fetch_native_chapters_raises_on_ytdlp_failure():
    from app.services.olorin.video_transcriber import (
        fetch_native_chapters_via_ytdlp,
    )

    proc = MagicMock()
    proc.returncode = 1
    proc.communicate = AsyncMock(return_value=(b"", b"Sign in to confirm"))

    with (
        patch(
            "app.services.olorin.video_transcriber.asyncio.create_subprocess_exec",
            new=AsyncMock(return_value=proc),
        ),
        patch(
            "app.services.olorin.video_transcriber.settings"
        ) as mock_settings,
    ):
        mock_settings.YTDLP_COOKIES_FILE = ""
        with pytest.raises(RuntimeError, match="yt-dlp"):
            await fetch_native_chapters_via_ytdlp("https://youtu.be/abc")
