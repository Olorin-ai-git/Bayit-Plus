"""Unit tests for vision-ask API endpoint."""
import base64
import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from PIL import Image
from starlette.testclient import TestClient
from starlette.requests import Request as StarletteRequest


from app.models.vod_interaction import CharacterResponse


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_jpeg_b64(width: int = 320, height: int = 180) -> str:
    img = Image.new("RGB", (width, height), color=(128, 64, 32))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def _mock_session(user_id: str = "u1", status: str = "active") -> MagicMock:
    session = MagicMock()
    session.id = "session123"
    session.user_id = user_id
    session.profile_id = "p1"
    session.content_id = "c1"
    session.character_name = "Hildy"
    session.scene_context = "Newsroom scene."
    session.character_description = "Fast-talking reporter."
    session.character_voice_id = "voice123"
    session.character_frame_url = "https://gcs/hildy.jpg"
    session.persona_mode = "character"
    session.audience_description = ""
    session.child_first_name = "Danny"
    session.status = status
    session.moment_timestamp = 42.0
    session.dialogue_exchanges = []
    session.save = AsyncMock()
    return session


def _fake_request() -> StarletteRequest:
    """Build a minimal Starlette Request that satisfies the rate limiter."""
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/vod-interactions/sessions/s1/vision-ask",
        "headers": [],
        "query_string": b"",
        "root_path": "",
        "client": ("127.0.0.1", 12345),
    }
    return StarletteRequest(scope)


# ---------------------------------------------------------------------------
# Feature flag
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_vision_ask_returns_404_when_disabled():
    from app.api.routes.vod_interaction_vision import vision_ask
    from app.schemas.vision_grounded import VisionAskRequest

    request_body = VisionAskRequest(
        frame_b64=_make_jpeg_b64(),
        tap_x=0.5, tap_y=0.5,
    )
    mock_user = MagicMock()
    mock_user.id = "u1"

    with patch(
        "app.api.routes.vod_interaction_vision.settings"
    ) as mock_settings:
        mock_settings.VOD_VISION_GROUNDED_ENABLED = False
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await vision_ask(
                request=_fake_request(),
                session_id="s1",
                body=request_body,
                current_user=mock_user,
            )
        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Session ownership
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_vision_ask_rejects_wrong_user():
    from app.api.routes.vod_interaction_vision import vision_ask
    from app.schemas.vision_grounded import VisionAskRequest

    request_body = VisionAskRequest(
        frame_b64=_make_jpeg_b64(),
        tap_x=0.5, tap_y=0.5,
    )
    mock_user = MagicMock()
    mock_user.id = "different_user"

    session = _mock_session(user_id="u1")

    with patch(
        "app.api.routes.vod_interaction_vision.settings"
    ) as mock_settings, patch(
        "app.api.routes.vod_interaction_vision.VODInteractionSession"
    ) as MockSession:
        mock_settings.VOD_VISION_GROUNDED_ENABLED = True
        mock_settings.VOD_INTERACTION_MAX_EXCHANGES = 10
        MockSession.get = AsyncMock(return_value=session)

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await vision_ask(
                request=_fake_request(),
                session_id="s1",
                body=request_body,
                current_user=mock_user,
            )
        assert exc_info.value.status_code == 403
