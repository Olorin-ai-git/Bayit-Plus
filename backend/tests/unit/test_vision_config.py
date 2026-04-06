"""Unit tests for vision-grounded configuration defaults."""
from app.core.config import settings


def test_vision_grounded_defaults():
    assert hasattr(settings, "VOD_VISION_GROUNDED_ENABLED")
    assert settings.VOD_VISION_GROUNDED_ENABLED is False


def test_vision_frame_max_bytes_default():
    assert settings.VOD_VISION_FRAME_MAX_BYTES == 500_000


def test_vision_frame_max_dimension_default():
    assert settings.VOD_VISION_FRAME_MAX_DIMENSION == 1568


def test_vision_default_question():
    assert "pointing at" in settings.VOD_VISION_DEFAULT_QUESTION
