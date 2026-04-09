"""Tests for training content chapter warning logic."""

from app.api.routes.training.content import _compute_warnings


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
