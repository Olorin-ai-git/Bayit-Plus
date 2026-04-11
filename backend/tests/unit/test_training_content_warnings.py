"""Tests for training content chapter warning logic."""

from app.api.routes.training.content_utils import _compute_warnings


class TestComputeWarnings:
    """_compute_warnings returns warning codes based on chapter count + duration."""

    def test_no_chapters_returns_warning(self):
        warnings = _compute_warnings(chapter_count=0, duration_str=None)
        assert any(w["code"] == "no_chapters" for w in warnings)

    def test_many_chapters_returns_no_warnings(self):
        warnings = _compute_warnings(chapter_count=5, duration_str="0:15:00")
        assert len(warnings) == 0

    def test_few_chapters_long_video_returns_warning(self):
        warnings = _compute_warnings(chapter_count=2, duration_str="0:45:00")
        assert any(w["code"] == "few_chapters" for w in warnings)

    def test_few_chapters_short_video_no_warning(self):
        warnings = _compute_warnings(chapter_count=1, duration_str="0:05:00")
        assert len(warnings) == 0

    def test_none_duration_with_no_chapters(self):
        warnings = _compute_warnings(chapter_count=0, duration_str=None)
        assert any(w["code"] == "no_chapters" for w in warnings)

    def test_few_chapters_no_duration_no_few_warning(self):
        warnings = _compute_warnings(chapter_count=2, duration_str=None)
        assert not any(w["code"] == "few_chapters" for w in warnings)


def test_no_chapters_warning_absent_when_chapters_present():
    """Sanity: when chapter_count > 2, neither warning code is emitted.

    Regression guard for the CHAPTERS pipeline stage — once that stage
    populates VideoChapters from yt-dlp or AI fallback, the chapter_count
    flowing into _compute_warnings should be > 0 and these warnings must
    disappear from the content payload.
    """
    warnings = _compute_warnings(chapter_count=5, duration_str="0:15:00")
    codes = {w["code"] for w in warnings}
    assert "no_chapters" not in codes
    assert "few_chapters" not in codes


def test_no_chapters_warning_present_when_zero():
    """Regression guard: chapter_count=0 must still emit no_chapters."""
    warnings = _compute_warnings(chapter_count=0, duration_str="0:15:00")
    assert any(w["code"] == "no_chapters" for w in warnings)
