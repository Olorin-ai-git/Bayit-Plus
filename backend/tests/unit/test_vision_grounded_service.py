"""Unit tests for VisionGroundedService."""
import base64
import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from PIL import Image

from app.services.vod_interaction.vision_grounded_service import (
    VisionGroundedService,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_jpeg_b64(width: int = 320, height: int = 180) -> str:
    """Create a minimal valid JPEG image as base64."""
    img = Image.new("RGB", (width, height), color=(128, 64, 32))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def _make_png_b64(width: int = 320, height: int = 180) -> str:
    """Create a PNG image as base64 (invalid format for vision)."""
    img = Image.new("RGB", (width, height), color=(128, 64, 32))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _make_session(**kwargs) -> MagicMock:
    """Construct a mock session."""
    defaults = dict(
        id="sess123",
        user_id="u1", profile_id="p1", content_id="c1",
        character_name="Hildy", scene_context="Newsroom scene.",
        character_description="Fast-talking reporter.",
        character_voice_id="voice123",
        character_frame_url="https://gcs/hildy.jpg",
        persona_mode="character", audience_description="",
        child_first_name="Danny", status="active",
        dialogue_exchanges=[], moment_timestamp=42.0,
    )
    defaults.update(kwargs)
    session = MagicMock()
    for k, v in defaults.items():
        setattr(session, k, v)
    return session


# ---------------------------------------------------------------------------
# Frame validation
# ---------------------------------------------------------------------------

def test_validate_frame_accepts_valid_jpeg():
    service = VisionGroundedService()
    frame_b64 = _make_jpeg_b64(640, 360)
    result = service.validate_and_prepare_frame(frame_b64)
    assert isinstance(result, bytes)
    assert result[:2] == b"\xff\xd8"


def test_validate_frame_rejects_non_jpeg():
    service = VisionGroundedService()
    frame_b64 = _make_png_b64()
    with pytest.raises(ValueError, match="JPEG"):
        service.validate_and_prepare_frame(frame_b64)


def test_validate_frame_rejects_oversized():
    service = VisionGroundedService()
    # Create bytes that exceed 500KB
    raw = b"\xff\xd8\xff\xe0" + b"\x00" * 500_001
    frame_b64 = base64.b64encode(raw).decode()
    with pytest.raises(ValueError, match="exceeds maximum"):
        service.validate_and_prepare_frame(frame_b64)


def test_validate_frame_resizes_oversized_dimensions():
    service = VisionGroundedService()
    frame_b64 = _make_jpeg_b64(3200, 1800)
    result = service.validate_and_prepare_frame(frame_b64)
    img = Image.open(io.BytesIO(result))
    assert max(img.size) <= 1568


def test_validate_frame_rejects_invalid_base64():
    service = VisionGroundedService()
    with pytest.raises(ValueError, match="decode"):
        service.validate_and_prepare_frame("not-valid-base64!!!")


# ---------------------------------------------------------------------------
# Prompt building
# ---------------------------------------------------------------------------

def test_build_vision_prompt_character_mode():
    service = VisionGroundedService()
    system, user_content = service.build_vision_prompt(
        character_name="Hildy",
        scene_context="Newsroom scene.",
        character_description="Fast-talking reporter.",
        tap_x=0.6,
        tap_y=0.45,
        user_message="What's that on the desk?",
        memory_context="",
        persona_mode="character",
        audience_description="",
        child_name="Danny",
        frame_b64_prepared=base64.b64encode(b"\xff\xd8test").decode(),
    )
    assert "Hildy" in system
    assert "60%" in system
    assert "45%" in system
    assert "in character" in system.lower()
    assert any(
        block.get("type") == "image" for block in user_content
        if isinstance(block, dict)
    )


def test_build_vision_prompt_speaker_mode():
    service = VisionGroundedService()
    system, user_content = service.build_vision_prompt(
        character_name="Sasan",
        scene_context="TED talk about education.",
        character_description="Education researcher.",
        tap_x=0.3,
        tap_y=0.7,
        user_message="What's that diagram?",
        memory_context="",
        persona_mode="speaker",
        audience_description="university students",
        child_name="",
        frame_b64_prepared=base64.b64encode(b"\xff\xd8test").decode(),
    )
    assert "expert guide" in system.lower()
    assert "university students" in system


def test_build_vision_prompt_includes_memory():
    service = VisionGroundedService()
    memory = "<memory>\nStudent asked about motivations.\n</memory>"
    system, _ = service.build_vision_prompt(
        character_name="Hildy",
        scene_context="Newsroom.",
        character_description="Reporter.",
        tap_x=0.5, tap_y=0.5,
        user_message="Who is that?",
        memory_context=memory,
        persona_mode="character",
        audience_description="",
        child_name="Danny",
        frame_b64_prepared=base64.b64encode(b"\xff\xd8test").decode(),
    )
    assert "Student asked about motivations." in system


def test_build_vision_prompt_default_question():
    service = VisionGroundedService()
    _, user_content = service.build_vision_prompt(
        character_name="Hildy",
        scene_context="Newsroom.",
        character_description="Reporter.",
        tap_x=0.5, tap_y=0.5,
        user_message="",
        memory_context="",
        persona_mode="character",
        audience_description="",
        child_name="",
        frame_b64_prepared=base64.b64encode(b"\xff\xd8test").decode(),
    )
    text_blocks = [
        block for block in user_content
        if isinstance(block, dict) and block.get("type") == "text"
    ]
    assert any("pointing at" in b["text"] for b in text_blocks)


# ---------------------------------------------------------------------------
# Full process_vision_question
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_process_vision_question_success():
    service = VisionGroundedService()
    session = _make_session()
    frame_b64 = _make_jpeg_b64()

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="That's my telephone.")]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch(
        "app.services.vod_interaction.vision_grounded_service.get_anthropic_client",
        return_value=mock_client,
    ), patch(
        "app.services.vod_interaction.vision_grounded_service.film_memory_service",
    ) as mock_mem:
        mock_mem.get_or_create = AsyncMock(return_value=MagicMock())
        mock_mem.build_memory_context = MagicMock(return_value="")

        result = await service.process_vision_question(
            session=session,
            frame_b64=frame_b64,
            tap_x=0.6,
            tap_y=0.45,
            user_message="What's that?",
        )

    assert result.text == "That's my telephone."
    assert result.emotion is not None


@pytest.mark.asyncio
async def test_process_vision_question_safety_filter():
    service = VisionGroundedService()
    session = _make_session()
    frame_b64 = _make_jpeg_b64()

    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="That's a violent weapon.")]

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch(
        "app.services.vod_interaction.vision_grounded_service.get_anthropic_client",
        return_value=mock_client,
    ), patch(
        "app.services.vod_interaction.vision_grounded_service.film_memory_service",
    ) as mock_mem:
        mock_mem.get_or_create = AsyncMock(return_value=MagicMock())
        mock_mem.build_memory_context = MagicMock(return_value="")

        result = await service.process_vision_question(
            session=session,
            frame_b64=frame_b64,
            tap_x=0.5, tap_y=0.5,
            user_message="What's that?",
        )

    assert result.text == "Hmm, let me think about that differently..."
