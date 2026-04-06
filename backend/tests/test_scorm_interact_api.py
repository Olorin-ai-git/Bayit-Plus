"""Tests for SCORM live interaction endpoint."""

from app.api.routes.training.scorm_interact import (
    ScormInteractRequest,
    ScormInteractResponse,
    ScormHealthResponse,
)


def test_interact_request_model():
    req = ScormInteractRequest(
        token="tok_test",
        content_id="c1",
        character_name="Doc Brown",
        question="How does the flux capacitor work?",
    )
    assert req.token == "tok_test"
    assert req.character_name == "Doc Brown"
    assert req.context == []


def test_interact_request_with_context():
    req = ScormInteractRequest(
        token="tok_test",
        content_id="c1",
        character_name="Doc Brown",
        question="Tell me more",
        context=[{"q": "What year?", "a": "1985"}],
    )
    assert len(req.context) == 1


def test_interact_response_model():
    resp = ScormInteractResponse(
        response_text="The flux capacitor is what makes time travel possible.",
        audio_base64="base64data",
    )
    assert resp.video_url is None


def test_health_response_model():
    resp = ScormHealthResponse(
        status="ok",
        token_remaining=495,
    )
    assert resp.status == "ok"
