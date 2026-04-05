"""Integration tests for GET /api/v1/comprehension/share/{share_token} (D-09)."""
import re
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.comprehension import share as share_route
from app.models.comprehension_report import ComprehensionReport, ReportTurn
from app.models.comprehension_session import ComprehensionSession


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(share_route.router, prefix="/api/v1")
    return app


def _fake_session(session_id: str = "sess-S") -> ComprehensionSession:
    with patch.object(
        ComprehensionSession, "get_pymongo_collection", return_value=MagicMock(),
    ):
        s = ComprehensionSession(
            user_id="u1", profile_id="p1", content_id="c1",
            character_name="Hildy",
            share_token="tok_" + "a" * 32,
        )
    s.id = session_id  # type: ignore[assignment]
    return s


def _fake_report() -> ComprehensionReport:
    with patch.object(
        ComprehensionReport, "get_pymongo_collection", return_value=MagicMock(),
    ):
        return ComprehensionReport(
            comprehension_session_id="sess-S", partner_id="org-a",
            user_id="u", profile_id="p", content_id="c", character_name="H",
            turn_count=1, avg_score=2.0,
            high_count=0, med_count=1, low_count=0,
            turns=[ReportTurn(
                turn_index=0, question_text="Q", student_answer="A",
                numeric_score=2, rationale="ok", adapt_level="initial",
                moment_timestamp=0.0, override_applied=False,
                original_numeric_score=2, original_rationale="ok",
            )],
        )


def test_share_happy_path_returns_sanitised_report() -> None:
    token = "tok_" + "a" * 32
    app = _build_app()
    with patch.object(
        ComprehensionSession, "find_one", AsyncMock(return_value=_fake_session()),
    ), patch.object(
        ComprehensionReport, "find_one", AsyncMock(return_value=_fake_report()),
    ):
        client = TestClient(app)
        r = client.get(f"/api/v1/comprehension/share/{token}")
    assert r.status_code == 200, r.text
    blob = r.text
    assert not re.search(r"numeric_score", blob, re.IGNORECASE)
    assert not re.search(r"rubric", blob, re.IGNORECASE)
    assert not re.search(r"grader", blob, re.IGNORECASE)
    assert not re.search(r'"score"\s*:\s*\d', blob)
    assert r.json()["turns"][0]["band"] == "med"


def test_share_invalid_token_returns_404() -> None:
    app = _build_app()
    with patch.object(
        ComprehensionSession, "find_one", AsyncMock(return_value=None),
    ):
        client = TestClient(app)
        r = client.get("/api/v1/comprehension/share/" + "z" * 40)
    assert r.status_code == 404


def test_share_pending_when_report_missing() -> None:
    token = "tok_" + "a" * 32
    app = _build_app()
    with patch.object(
        ComprehensionSession, "find_one", AsyncMock(return_value=_fake_session()),
    ), patch.object(
        ComprehensionReport, "find_one", AsyncMock(return_value=None),
    ):
        client = TestClient(app)
        r = client.get(f"/api/v1/comprehension/share/{token}")
    assert r.status_code == 200
    assert r.json()["status"] == "generating"
