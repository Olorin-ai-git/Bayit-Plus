"""Tests for training content format change logic."""

from app.api.routes.training.content_edit import FormatChangeRequest


class TestFormatChangeRequest:
    """FormatChangeRequest validates format_id values."""

    def test_valid_format_id(self):
        req = FormatChangeRequest(format_id="self-paced")
        assert req.format_id == "self-paced"

    def test_valid_format_with_overrides(self):
        req = FormatChangeRequest(
            format_id="knowledge-check",
            format_overrides={"quizzes": {"passThreshold": 90}},
        )
        assert req.format_id == "knowledge-check"
        assert req.format_overrides is not None

    def test_empty_format_id_rejected(self):
        import pytest
        with pytest.raises(Exception):
            FormatChangeRequest(format_id="")
