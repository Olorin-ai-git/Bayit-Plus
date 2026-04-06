"""Integration tests for /api/v1/partner/comprehension/* (Phase 3 B2B SDK).

Uses TestClient with get_current_partner overridden + all Mongo access
patched. Asserts DTO sanitisation at the HTTP boundary via JSON-body regex.
"""
import json
import re
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.comprehension import partner as partner_routes
from app.api.routes.olorin.dependencies import get_current_partner
from app.models.comprehension_report import ComprehensionReport, ReportTurn
from app.models.comprehension_session import (
    ComprehensionSession,
    ScoredExchange,
)
from app.schemas.comprehension import AdaptLevel, RubricScore


class _FakePartner:
    """Minimal IntegrationPartner surrogate with save() + has_capability()."""

    def __init__(
        self,
        partner_id: str = "org-a",
        capabilities: dict | None = None,
        training_config: dict | None = None,
    ):
        self.partner_id = partner_id
        self._caps = capabilities or {
            "comprehension_mode": SimpleNamespace(enabled=True),
        }
        self.training_config = training_config or {
            "org_tier": "organization",
            "credits_remaining": 100,
        }
        self.save = AsyncMock(return_value=None)

    def has_capability(self, capability: str) -> bool:
        cfg = self._caps.get(capability)
        return cfg is not None and getattr(cfg, "enabled", False)


def _build_app(partner: _FakePartner) -> FastAPI:
    app = FastAPI()
    app.include_router(partner_routes.router, prefix="/api/v1")

    async def _fake_partner_dep():
        return partner

    app.dependency_overrides[get_current_partner] = _fake_partner_dep
    return app


def _create_payload() -> dict:
    return {
        "content_id": "his-girl-friday",
        "user_id": "u1",
        "profile_id": "p1",
        "character_name": "Hildy",
    }


def _turn_payload() -> dict:
    return {
        "question_text": "Why does Walter call?",
        "student_answer": "To keep her.",
        "scoring_criteria": "motive recall",
        "playback_seconds": 120.0,
        "moment_timestamp": 100.0,
    }


def _fake_session(session_id: str = "sess-X") -> ComprehensionSession:
    with patch.object(
        ComprehensionSession, "get_pymongo_collection", return_value=MagicMock(),
    ):
        s = ComprehensionSession(
            user_id="u1", profile_id="p1", content_id="his-girl-friday",
            character_name="Hildy", partner_id="org-a",
            external_session_id=None, share_token="tok_" + "x" * 32,
        )
    s.id = session_id  # type: ignore[assignment]
    return s


def test_create_session_success_emits_metering() -> None:
    partner = _FakePartner()
    app = _build_app(partner)

    async def _insert(self=None):
        self.id = "sess-new"
        return self

    metering_mock = AsyncMock(return_value=None)
    with patch.object(
        ComprehensionSession, "get_pymongo_collection",
        return_value=MagicMock(),
    ), patch.object(
        ComprehensionSession, "insert", _insert,
    ), patch.object(
        partner_routes, "emit_comprehension_session_started", metering_mock,
    ):
        client = TestClient(app)
        r = client.post(
            "/api/v1/partner/comprehension/sessions", json=_create_payload(),
        )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["content_id"] == "his-girl-friday"
    metering_mock.assert_awaited_once()


def test_create_session_wrong_tier_returns_403() -> None:
    partner = _FakePartner(training_config={"org_tier": "team"})
    app = _build_app(partner)
    client = TestClient(app)
    r = client.post(
        "/api/v1/partner/comprehension/sessions", json=_create_payload(),
    )
    assert r.status_code == 403


def test_create_session_idempotent_with_external_session_id() -> None:
    partner = _FakePartner()
    app = _build_app(partner)
    existing = _fake_session("sess-EX")
    existing.external_session_id = "ext-42"
    with patch.object(
        ComprehensionSession, "get_pymongo_collection",
        return_value=MagicMock(),
    ), patch.object(
        ComprehensionSession, "find_one", AsyncMock(return_value=existing),
    ):
        client = TestClient(app)
        r = client.post(
            "/api/v1/partner/comprehension/sessions",
            json=_create_payload(),
            headers={"X-External-Session-Id": "ext-42"},
        )
    assert r.status_code == 201
    body = r.json()
    assert body["session_id"] == "sess-EX"
    assert body["external_session_id"] == "ext-42"


def test_post_turn_success_deducts_credits_and_emits_metering() -> None:
    partner = _FakePartner(training_config={
        "org_tier": "organization", "credits_remaining": 5,
    })
    app = _build_app(partner)
    session = _fake_session("sess-T")

    async def _save_noop(self=None):
        return None

    async def _orch(
        session, scene_context, playback_seconds, question_text,
        student_answer, answer_modality, rubric, character_name,
        personality_traits, moment_timestamp,
    ):
        session.exchanges.append(
            ScoredExchange(
                question_text=question_text,
                student_answer=student_answer,
                score=RubricScore(score=2, rationale="ok"),
                adapt_level=AdaptLevel.HARDER,
                moment_timestamp=moment_timestamp,
            ),
        )
        return {
            "score": RubricScore(score=2, rationale="ok"),
            "follow_up": None,
            "adapt_level": AdaptLevel.HARDER,
            "memory_retry_pending": False,
        }

    metering_mock = AsyncMock(return_value=None)
    with patch.object(
        ComprehensionSession, "get", AsyncMock(return_value=session),
    ), patch.object(
        type(session), "save", AsyncMock(side_effect=_save_noop),
    ), patch.object(
        partner_routes.comprehension_session_orchestrator, "run_turn",
        AsyncMock(side_effect=_orch),
    ), patch.object(
        partner_routes, "emit_comprehension_turn_posted", metering_mock,
    ):
        client = TestClient(app)
        r = client.post(
            "/api/v1/partner/comprehension/sessions/sess-T/turns",
            json=_turn_payload(),
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["band"] == "med"
    # Credits deducted by COMPREHENSION_TURN_CREDIT_COST (default 1).
    assert partner.training_config["credits_remaining"] == 4
    metering_mock.assert_awaited_once()
    partner.save.assert_awaited_once()
    # Sanitisation invariant at the HTTP boundary.
    blob = json.dumps(body)
    assert not re.search(r"numeric_score", blob, re.IGNORECASE)
    assert not re.search(r"rubric", blob, re.IGNORECASE)
    assert not re.search(r"grader", blob, re.IGNORECASE)
    assert not re.search(r'"score"\s*:\s*\d', blob)


def test_post_turn_insufficient_credits_returns_402() -> None:
    partner = _FakePartner(training_config={
        "org_tier": "organization", "credits_remaining": 0,
    })
    app = _build_app(partner)
    session = _fake_session()
    with patch.object(
        ComprehensionSession, "get", AsyncMock(return_value=session),
    ):
        client = TestClient(app)
        r = client.post(
            "/api/v1/partner/comprehension/sessions/sess-X/turns",
            json=_turn_payload(),
        )
    assert r.status_code == 402


def test_get_session_returns_sanitised_dtos() -> None:
    partner = _FakePartner()
    app = _build_app(partner)
    session = _fake_session()
    session.exchanges.append(
        ScoredExchange(
            question_text="Q",
            student_answer="A",
            score=RubricScore(score=3, rationale="sharp"),
            adapt_level=AdaptLevel.HARDER,
            moment_timestamp=0.0,
        ),
    )
    with patch.object(
        ComprehensionSession, "get", AsyncMock(return_value=session),
    ):
        client = TestClient(app)
        r = client.get("/api/v1/partner/comprehension/sessions/sess-X")
    assert r.status_code == 200
    blob = r.text
    assert not re.search(r"numeric_score", blob, re.IGNORECASE)
    assert not re.search(r"rubric", blob, re.IGNORECASE)
    assert not re.search(r"grader", blob, re.IGNORECASE)
    assert not re.search(r'"score"\s*:\s*\d', blob)


def test_get_report_pending_when_missing() -> None:
    partner = _FakePartner()
    app = _build_app(partner)
    with patch.object(
        ComprehensionReport, "find_one", AsyncMock(return_value=None),
    ):
        client = TestClient(app)
        r = client.get("/api/v1/partner/comprehension/sessions/sess-X/report")
    assert r.status_code == 200
    assert r.json()["status"] == "pending_or_failed"


def test_get_report_returns_sanitised_dto() -> None:
    partner = _FakePartner()
    app = _build_app(partner)
    with patch.object(
        ComprehensionReport, "get_pymongo_collection", return_value=MagicMock(),
    ):
        report = ComprehensionReport(
            comprehension_session_id="sess-X", partner_id="org-a",
            user_id="u", profile_id="p", content_id="c", character_name="H",
            turn_count=1, avg_score=3.0,
            high_count=1, med_count=0, low_count=0,
            turns=[ReportTurn(
                turn_index=0, question_text="Q", student_answer="A",
                numeric_score=3, rationale="sharp", adapt_level="initial",
                moment_timestamp=0.0, override_applied=False,
                original_numeric_score=3, original_rationale="sharp",
            )],
        )
    with patch.object(
        ComprehensionReport, "find_one", AsyncMock(return_value=report),
    ):
        client = TestClient(app)
        r = client.get("/api/v1/partner/comprehension/sessions/sess-X/report")
    assert r.status_code == 200
    blob = r.text
    assert not re.search(r"numeric_score", blob, re.IGNORECASE)
    assert not re.search(r"rubric", blob, re.IGNORECASE)
    assert not re.search(r"grader", blob, re.IGNORECASE)
    assert not re.search(r'"score"\s*:\s*\d', blob)
    assert r.json()["turns"][0]["band"] == "high"
