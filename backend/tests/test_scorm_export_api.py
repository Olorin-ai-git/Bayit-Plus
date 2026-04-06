"""Tests for SCORM export CRUD API endpoints."""

from app.api.routes.training.exports import (
    CreateExportRequest,
    ExportResponse,
)


def test_create_export_request_defaults():
    req = CreateExportRequest(content_id="abc123")
    assert req.completion_rule == "video_plus_quiz"
    assert req.video_threshold_pct == 80
    assert req.quiz_pass_pct == 70
    assert req.video_source == "stream"
    assert req.included_characters is None
    assert req.token_cap == 500


def test_create_export_request_custom():
    req = CreateExportRequest(
        content_id="abc123",
        completion_rule="video_only",
        video_threshold_pct=90,
        included_characters=["Speaker 1", "Speaker 2"],
        token_cap=1000,
    )
    assert req.completion_rule == "video_only"
    assert req.video_threshold_pct == 90
    assert len(req.included_characters) == 2
    assert req.token_cap == 1000


def test_export_response_model():
    resp = ExportResponse(
        id="exp_1",
        content_id="abc123",
        status="pending",
        progress_pct=0,
        completion_rule="video_plus_quiz",
        tier_at_export="organization",
        characters_included=3,
        qa_pairs_generated=0,
        character_status=[],
        created_at="2026-04-06T00:00:00Z",
    )
    assert resp.status == "pending"
    assert resp.tier_at_export == "organization"
