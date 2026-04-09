"""Tests for video URL whitelist validation."""

from app.utils.video_url_utils import validate_video_url


class TestValidateVideoUrl:
    def test_youtube_standard(self):
        ok, err = validate_video_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        assert ok is True
        assert err == ""

    def test_youtube_short(self):
        ok, err = validate_video_url("https://youtu.be/dQw4w9WgXcQ")
        assert ok is True

    def test_vimeo(self):
        ok, err = validate_video_url("https://vimeo.com/123456789")
        assert ok is True

    def test_dailymotion(self):
        ok, err = validate_video_url("https://www.dailymotion.com/video/x7abc12")
        assert ok is True

    def test_direct_mp4(self):
        ok, err = validate_video_url("https://cdn.example.com/training/intro.mp4")
        assert ok is True

    def test_direct_webm(self):
        ok, err = validate_video_url("https://cdn.example.com/video.webm")
        assert ok is True

    def test_direct_mov(self):
        ok, err = validate_video_url("https://cdn.example.com/clip.mov")
        assert ok is True

    def test_direct_mp4_with_query_params(self):
        ok, err = validate_video_url("https://cdn.example.com/video.mp4?token=abc")
        assert ok is True

    def test_rejects_wikipedia(self):
        ok, err = validate_video_url("https://en.wikipedia.org/wiki/Cat")
        assert ok is False
        assert "Only" in err

    def test_rejects_pdf(self):
        ok, err = validate_video_url("https://example.com/report.pdf")
        assert ok is False

    def test_rejects_random_website(self):
        ok, err = validate_video_url("https://example.com/page")
        assert ok is False

    def test_rejects_empty(self):
        ok, err = validate_video_url("")
        assert ok is False

    def test_rejects_ftp(self):
        ok, err = validate_video_url("ftp://files.example.com/video.mp4")
        assert ok is False

    def test_rejects_no_scheme(self):
        ok, err = validate_video_url("www.youtube.com/watch?v=abc")
        assert ok is False

    def test_direct_mkv(self):
        ok, err = validate_video_url("https://cdn.example.com/movie.mkv")
        assert ok is True

    def test_direct_avi(self):
        ok, err = validate_video_url("https://cdn.example.com/clip.avi")
        assert ok is True

    def test_case_insensitive_extension(self):
        ok, err = validate_video_url("https://cdn.example.com/clip.MP4")
        assert ok is True
