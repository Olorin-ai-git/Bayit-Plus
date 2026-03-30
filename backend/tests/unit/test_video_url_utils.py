"""Unit tests for video URL validation and metadata extraction."""

import pytest


class TestVideoUrlValidation:
    def test_youtube_url_valid(self):
        from app.utils.video_url_utils import validate_video_url
        ok, err = validate_video_url("https://www.youtube.com/watch?v=abc123")
        assert ok is True
        assert err == ""

    def test_youtube_short_url_valid(self):
        from app.utils.video_url_utils import validate_video_url
        ok, err = validate_video_url("https://youtu.be/abc123")
        assert ok is True

    def test_vimeo_url_valid(self):
        from app.utils.video_url_utils import validate_video_url
        ok, err = validate_video_url("https://vimeo.com/123456789")
        assert ok is True

    def test_direct_mp4_valid(self):
        from app.utils.video_url_utils import validate_video_url
        ok, err = validate_video_url("https://cdn.example.com/video.mp4")
        assert ok is True

    def test_non_http_rejected(self):
        from app.utils.video_url_utils import validate_video_url
        ok, err = validate_video_url("ftp://evil.com/video.mp4")
        assert ok is False
        assert "http" in err.lower()

    def test_unsupported_host_rejected(self):
        from app.utils.video_url_utils import validate_video_url
        ok, err = validate_video_url("https://malware.example.com/page")
        assert ok is False

    def test_empty_url_rejected(self):
        from app.utils.video_url_utils import validate_video_url
        ok, err = validate_video_url("")
        assert ok is False


class TestCleanTitleForSearch:
    def test_strips_year_and_trailer(self):
        from app.utils.video_url_utils import clean_title_for_search
        candidates = clean_title_for_search(
            "Back To The Future (1985) Theatrical Trailer - Michael J. Fox Movie HD"
        )
        assert candidates[0] == "Back To The Future"

    def test_strips_official_trailer(self):
        from app.utils.video_url_utils import clean_title_for_search
        candidates = clean_title_for_search("The Matrix Official Trailer [HD]")
        assert any("The Matrix" == c for c in candidates)

    def test_strips_dash_suffix(self):
        from app.utils.video_url_utils import clean_title_for_search
        candidates = clean_title_for_search("Inception - Official Trailer HD")
        assert candidates[0] == "Inception"

    def test_simple_title_unchanged(self):
        from app.utils.video_url_utils import clean_title_for_search
        candidates = clean_title_for_search("Pulp Fiction")
        assert "Pulp Fiction" in candidates

    def test_returns_original_as_fallback(self):
        from app.utils.video_url_utils import clean_title_for_search
        raw = "Some Obscure Video Title"
        candidates = clean_title_for_search(raw)
        assert raw in candidates

    def test_real_youtube_title(self):
        from app.utils.video_url_utils import clean_title_for_search
        candidates = clean_title_for_search(
            "Jaws (1975) Official Trailer - Steven Spielberg Movie"
        )
        assert candidates[0] == "Jaws"


class TestOembedUrl:
    def test_youtube_oembed_url(self):
        from app.utils.video_url_utils import get_oembed_url
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        oembed = get_oembed_url(url)
        assert oembed is not None
        assert "youtube.com/oembed" in oembed

    def test_vimeo_oembed_url(self):
        from app.utils.video_url_utils import get_oembed_url
        oembed = get_oembed_url("https://vimeo.com/123456")
        assert oembed is not None
        assert "vimeo.com" in oembed

    def test_direct_link_no_oembed(self):
        from app.utils.video_url_utils import get_oembed_url
        oembed = get_oembed_url("https://cdn.example.com/movie.mp4")
        assert oembed is None
