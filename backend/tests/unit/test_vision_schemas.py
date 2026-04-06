"""Unit tests for vision-grounded request/response schemas."""
import base64

import pytest
from pydantic import ValidationError

from app.schemas.vision_grounded import VisionAskRequest, VisionAskResponse


def _dummy_frame() -> str:
    return base64.b64encode(b"\xff\xd8\xff\xe0" + b"\x00" * 100).decode()


def test_valid_request():
    req = VisionAskRequest(
        frame_b64=_dummy_frame(),
        tap_x=0.5,
        tap_y=0.3,
        user_message="What is that?",
        voice_only=False,
    )
    assert req.tap_x == 0.5
    assert req.tap_y == 0.3
    assert req.voice_only is False


def test_request_defaults():
    req = VisionAskRequest(
        frame_b64=_dummy_frame(),
        tap_x=0.5,
        tap_y=0.3,
    )
    assert req.user_message == ""
    assert req.voice_only is True


def test_tap_x_out_of_range():
    with pytest.raises(ValidationError):
        VisionAskRequest(frame_b64=_dummy_frame(), tap_x=1.5, tap_y=0.3)


def test_tap_y_out_of_range():
    with pytest.raises(ValidationError):
        VisionAskRequest(frame_b64=_dummy_frame(), tap_x=0.5, tap_y=-0.1)


def test_response_model():
    resp = VisionAskResponse(
        character_name="Hildy",
        response_text="That's my phone.",
        audio_url="https://storage.example.com/audio.mp3",
        animated_video_url="https://storage.example.com/video.mp4",
        tap_x=0.6,
        tap_y=0.45,
    )
    assert resp.character_name == "Hildy"
    assert resp.animated_video_url == "https://storage.example.com/video.mp4"


def test_response_model_voice_only():
    resp = VisionAskResponse(
        character_name="Walter",
        response_text="That's interesting.",
        audio_url="https://storage.example.com/audio.mp3",
        animated_video_url="",
        tap_x=0.3,
        tap_y=0.7,
    )
    assert resp.animated_video_url == ""
