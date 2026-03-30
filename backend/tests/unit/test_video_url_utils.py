"""Tests for video URL validation and title extraction (Phase F1)."""

import pytest

from app.utils.video_url_utils import (
    _title_from_url_path,
    clean_title_for_search,
    get_oembed_url,
    validate_video_url,
)


class TestValidateVideoUrl:
    """validate_video_url accepts any http/https URL."""

    def test_youtube_url(self):
        ok, err = validate_video_url(
            "https://www.youtube.com/watch?v=abc123"
        )
        assert ok is True
        assert err == ""

    def test_vimeo_url(self):
        ok, err = validate_video_url("https://vimeo.com/12345")
        assert ok is True
        assert err == ""

    def test_dailymotion_url(self):
        ok, err = validate_video_url(
            "https://www.dailymotion.com/video/x123"
        )
        assert ok is True
        assert err == ""

    def test_direct_mp4_link(self):
        ok, err = validate_video_url(
            "https://cdn.example.com/video.mp4"
        )
        assert ok is True
        assert err == ""

    def test_arbitrary_https_url(self):
        ok, err = validate_video_url(
            "https://media.company.com/training/onboarding-2024"
        )
        assert ok is True
        assert err == ""

    def test_plex_url(self):
        ok, err = validate_video_url(
            "https://app.plex.tv/desktop/#!/server/abc/details"
        )
        assert ok is True
        assert err == ""

    def test_http_url_accepted(self):
        ok, err = validate_video_url(
            "http://internal.corp.net/videos/meeting.webm"
        )
        assert ok is True
        assert err == ""

    def test_empty_url_rejected(self):
        ok, err = validate_video_url("")
        assert ok is False
        assert "required" in err.lower()

    def test_whitespace_only_rejected(self):
        ok, err = validate_video_url("   ")
        assert ok is False

    def test_ftp_scheme_rejected(self):
        ok, err = validate_video_url("ftp://files.example.com/v.mp4")
        assert ok is False
        assert "http" in err.lower()

    def test_no_scheme_rejected(self):
        ok, err = validate_video_url("example.com/video.mp4")
        assert ok is False

    def test_no_host_rejected(self):
        ok, err = validate_video_url("https://")
        assert ok is False


class TestGetOembedUrl:
    """oEmbed lookup remains available for known hosts."""

    def test_youtube_oembed(self):
        url = "https://www.youtube.com/watch?v=abc"
        result = get_oembed_url(url)
        assert result is not None
        assert "youtube.com/oembed" in result

    def test_vimeo_oembed(self):
        result = get_oembed_url("https://vimeo.com/12345")
        assert result is not None
        assert "vimeo.com" in result

    def test_unknown_host_returns_none(self):
        result = get_oembed_url("https://media.corp.com/v.mp4")
        assert result is None


class TestTitleFromUrlPath:
    """Fallback title derivation from URL paths."""

    def test_mp4_filename(self):
        title = _title_from_url_path(
            "https://cdn.example.com/videos/team-onboarding.mp4"
        )
        assert title == "team onboarding"

    def test_slug_with_underscores(self):
        title = _title_from_url_path(
            "https://example.com/training/intro_to_python"
        )
        assert title == "intro to python"

    def test_root_path_returns_none(self):
        title = _title_from_url_path("https://example.com/")
        assert title is None

    def test_empty_segment_returns_none(self):
        title = _title_from_url_path("https://example.com")
        assert title is None

    def test_encoded_path(self):
        title = _title_from_url_path(
            "https://example.com/my%20great%20video.webm"
        )
        assert title == "my great video"


class TestCleanTitleForSearch:
    """Existing title cleaning still works."""

    def test_strips_year_bracket(self):
        results = clean_title_for_search("Back to the Future (1985)")
        assert any("Back to the Future" in r for r in results)

    def test_strips_trailer_suffix(self):
        results = clean_title_for_search(
            "The Matrix Official Trailer HD"
        )
        assert any("The Matrix" in r for r in results)

    def test_raw_title_always_included(self):
        results = clean_title_for_search("Simple Title")
        assert "Simple Title" in results
