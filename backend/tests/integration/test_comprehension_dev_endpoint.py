"""Integration tests for POST /api/v1/comprehension/dev/turn.

Uses FastAPI TestClient with the orchestrator + session lookup mocked at
module level to avoid bringing up a real MongoDB for a dev-route smoke test.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import comprehension_dev as dev_route
from app.models.comprehension_session import ComprehensionSession
from app.schemas.comprehension import AdaptLevel, FollowUpQuestion, RubricScore


def _build_test_app(
    orchestrator_result: dict | None = None,
    session_id: str = "sess-TEST",
) -> FastAPI:
    """Build a minimal FastAPI app wiring only the comprehension-dev router."""
    app = FastAPI()
    app.include_router(
        dev_route.router,
        prefix="/api/v1/comprehension/dev",
        tags=["comprehension-dev"],
    )
    return app


def _base_payload() -> dict:
    return {
        "user_id": "u1",
        "profile_id": "p1",
        "content_id": "his-girl-friday",
        "character_name": "Walter Burns",
        "personality_traits": ["sharp"],
        "scene_context": "newsroom",
        "rubric": "explain the motive",
        "question_text": "Why did Walter call Hildy?",
        "student_answer": "To keep her on the story.",
        "playback_seconds": 120.0,
        "moment_timestamp": 100.0,
        "answer_modality": "text",
    }


class TestComprehensionDevEndpoint:
    def test_e1_happy_path_returns_score_and_followup(self, monkeypatch) -> None:
        app = _build_test_app()

        # Mock find_or_create_session to return a fake session
        fake_session = MagicMock()
        object.__setattr__(fake_session, "id", "sess-ABC")
        monkeypatch.setattr(
            dev_route,
            "_find_or_create_session",
            AsyncMock(return_value=fake_session),
        )

        # Mock orchestrator
        fake_result = {
            "score": RubricScore(score=2, rationale="Captured intent."),
            "follow_up": FollowUpQuestion(
                question_text="How does this shape her choice?",
                adapt_level=AdaptLevel.HARDER,
                in_character_phrasing="Say, Hildy...",
            ),
            "adapt_level": AdaptLevel.HARDER,
            "memory_retry_pending": False,
        }
        orch_mock = AsyncMock(return_value=fake_result)
        monkeypatch.setattr(
            dev_route.comprehension_session_orchestrator,
            "run_turn",
            orch_mock,
        )

        client = TestClient(app)
        response = client.post(
            "/api/v1/comprehension/dev/turn",
            json=_base_payload(),
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["score"]["score"] == 2
        assert body["score"]["band"] == "med"
        assert body["follow_up"]["adapt_level"] == "harder"
        assert body["follow_up"]["question_text"]
        assert body["adapt_level"] == "harder"
        assert body["memory_retry_pending"] is False
        assert body["session_id"] == "sess-ABC"

    def test_e2_missing_required_field_returns_422(self) -> None:
        app = _build_test_app()
        client = TestClient(app)
        payload = _base_payload()
        del payload["student_answer"]
        response = client.post(
            "/api/v1/comprehension/dev/turn",
            json=payload,
        )
        assert response.status_code == 422

    def test_e3_endpoint_registered_in_openapi(self, monkeypatch) -> None:
        app = _build_test_app()
        paths = set(app.openapi()["paths"].keys())
        assert "/api/v1/comprehension/dev/turn" in paths

    def test_e4_voice_modality_accepted(self, monkeypatch) -> None:
        app = _build_test_app()
        fake_session = MagicMock()
        object.__setattr__(fake_session, "id", "sess-V")
        monkeypatch.setattr(
            dev_route,
            "_find_or_create_session",
            AsyncMock(return_value=fake_session),
        )
        fake_result = {
            "score": RubricScore(score=1, rationale="Partial."),
            "follow_up": FollowUpQuestion(
                question_text="Try again.",
                adapt_level=AdaptLevel.SIMPLER_RETRY,
                in_character_phrasing="Let's think it over...",
            ),
            "adapt_level": AdaptLevel.SIMPLER_RETRY,
            "memory_retry_pending": False,
        }
        monkeypatch.setattr(
            dev_route.comprehension_session_orchestrator,
            "run_turn",
            AsyncMock(return_value=fake_result),
        )
        client = TestClient(app)
        payload = _base_payload()
        payload["answer_modality"] = "voice"
        response = client.post(
            "/api/v1/comprehension/dev/turn",
            json=payload,
        )
        assert response.status_code == 200
        assert response.json()["adapt_level"] == "simpler_retry"
