"""Integration tests for /api/v1/training/comprehension-reports/* (Phase 3).

Uses TestClient with Beanie-backed services mocked. The training JWT
dependency is overridden via FastAPI's dependency_overrides to simulate
teacher/viewer role claims without issuing real JWTs.
"""
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.training import comprehension_reports as training_reports
from app.api.routes.training.dependencies import (
    require_training_teacher_or_admin,
)
from app.models.comprehension_report import ComprehensionReport, ReportTurn
from app.models.comprehension_session import (
    ComprehensionSession,
    ScoredExchange,
)
from app.schemas.comprehension import AdaptLevel, RubricScore


def _build_app(user_role: str, partner_id: str = "org-a") -> FastAPI:
    app = FastAPI()
    app.include_router(training_reports.router, prefix="/api/v1/training")

    async def _fake_user():
        if user_role not in {"admin", "teacher"}:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher or admin access required",
            )
        return SimpleNamespace(
            id="tchr-1", role=user_role, partner_id=partner_id,
        )

    app.dependency_overrides[require_training_teacher_or_admin] = _fake_user
    return app


def _fake_report(
    session_id: str = "sess-1", partner_id: str = "org-a",
) -> MagicMock:
    report = MagicMock(spec=ComprehensionReport)
    report.comprehension_session_id = session_id
    report.partner_id = partner_id
    report.user_id = "u1"
    report.profile_id = "p1"
    report.content_id = "his-girl-friday"
    report.character_name = "Hildy"
    report.turn_count = 1
    report.avg_score = 2.0
    report.high_count = 0
    report.med_count = 1
    report.low_count = 0
    with patch.object(
        ReportTurn, "model_validate", wraps=ReportTurn.model_validate,
    ):
        report.turns = [
            ReportTurn(
                turn_index=0,
                question_text="Q",
                student_answer="A",
                numeric_score=2,
                rationale="ok",
                adapt_level="initial",
                moment_timestamp=0.0,
                override_applied=False,
                original_numeric_score=2,
                original_rationale="ok",
            ),
        ]
    report.status = "generated"
    report.generation_attempts = 1
    report.last_error = None
    report.generated_at = datetime.utcnow()
    return report


def _fake_session() -> ComprehensionSession:
    with patch.object(
        ComprehensionSession, "get_pymongo_collection", return_value=MagicMock(),
    ):
        session = ComprehensionSession(
            user_id="u1",
            profile_id="p1",
            content_id="his-girl-friday",
            character_name="Hildy",
            partner_id="org-a",
            exchanges=[
                ScoredExchange(
                    question_text="Q",
                    student_answer="A",
                    score=RubricScore(score=2, rationale="ok"),
                    adapt_level=AdaptLevel.INITIAL,
                    moment_timestamp=0.0,
                ),
            ],
        )
    return session


def test_get_report_teacher_happy_path() -> None:
    app = _build_app("teacher")
    with patch.object(
        ComprehensionReport, "find_one", AsyncMock(return_value=_fake_report()),
    ):
        client = TestClient(app)
        r = client.get("/api/v1/training/comprehension-reports/sess-1")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["session_id"] == "sess-1"
    assert body["turns"][0]["numeric_score"] == 2


def test_get_report_viewer_forbidden() -> None:
    app = _build_app("viewer")
    client = TestClient(app)
    r = client.get("/api/v1/training/comprehension-reports/sess-1")
    assert r.status_code == 403


def test_get_report_cross_org_not_found() -> None:
    app = _build_app("teacher", partner_id="org-a")
    foreign = _fake_report(partner_id="org-b")
    with patch.object(
        ComprehensionReport, "find_one", AsyncMock(return_value=foreign),
    ):
        client = TestClient(app)
        r = client.get("/api/v1/training/comprehension-reports/sess-1")
    assert r.status_code == 404


def test_post_override_happy_path_rebuilds_report() -> None:
    app = _build_app("teacher")
    session = _fake_session()

    async def _save_noop(self=None):
        return None

    rebuilt = _fake_report()
    with patch.object(
        ComprehensionReport, "find_one",
        AsyncMock(return_value=_fake_report()),
    ), patch.object(
        ComprehensionSession, "get", AsyncMock(return_value=session),
    ), patch.object(
        type(session), "save", AsyncMock(side_effect=_save_noop),
    ), patch.object(
        training_reports, "build_report_from_session",
        return_value=rebuilt,
    ), patch.object(
        training_reports, "_upsert_report",
        AsyncMock(return_value=rebuilt),
    ):
        client = TestClient(app)
        r = client.post(
            "/api/v1/training/comprehension-reports/sess-1/turns/0/override",
            json={"score_after": 3, "rationale_after": "revised"},
        )
    assert r.status_code == 200, r.text
    assert len(session.exchanges[0].overrides) == 1
    assert session.exchanges[0].overrides[0].score_after == 3
    assert session.exchanges[0].overrides[0].teacher_id == "tchr-1"


def test_post_override_viewer_forbidden() -> None:
    app = _build_app("viewer")
    client = TestClient(app)
    r = client.post(
        "/api/v1/training/comprehension-reports/sess-1/turns/0/override",
        json={"score_after": 2, "rationale_after": "x"},
    )
    assert r.status_code == 403


def test_post_override_invalid_score_returns_422() -> None:
    app = _build_app("teacher")
    client = TestClient(app)
    r = client.post(
        "/api/v1/training/comprehension-reports/sess-1/turns/0/override",
        json={"score_after": 7, "rationale_after": "x"},
    )
    assert r.status_code == 422


def test_post_override_cross_org_404() -> None:
    app = _build_app("teacher", partner_id="org-a")
    foreign = _fake_report(partner_id="org-b")
    with patch.object(
        ComprehensionReport, "find_one", AsyncMock(return_value=foreign),
    ):
        client = TestClient(app)
        r = client.post(
            "/api/v1/training/comprehension-reports/sess-1/turns/0/override",
            json={"score_after": 2, "rationale_after": "x"},
        )
    assert r.status_code == 404
