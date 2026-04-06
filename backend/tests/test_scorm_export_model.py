"""Tests for ScormExport model."""

from datetime import datetime

from app.models.scorm_export import (
    CharacterExportStatus,
    ScormExport,
)


def test_character_export_status_defaults():
    status = CharacterExportStatus(name="Doc Brown")
    assert status.name == "Doc Brown"
    assert status.face_extracted is False
    assert status.voice_cloned is False
    assert status.qa_expanded is False
    assert status.audio_generated is False
    assert status.video_generated is False
    assert status.fallback_reason is None


def test_scorm_export_defaults():
    export = ScormExport.model_construct(
        partner_id="acme-corp",
        content_id="abc123",
        created_by="admin-user-1",
        export_token="tok_test_123",
        status="pending",
        progress_pct=0,
        completion_rule="video_plus_quiz",
        video_threshold_pct=80,
        quiz_pass_pct=70,
        included_characters=None,
        video_source="stream",
        token_cap=500,
        token_used=0,
        package_url=None,
        tier_at_export="team",
        characters_included=0,
        character_status=[],
        created_at=datetime.now(),
    )
    assert export.status == "pending"
    assert export.progress_pct == 0
    assert export.completion_rule == "video_plus_quiz"
    assert export.video_threshold_pct == 80
    assert export.quiz_pass_pct == 70
    assert export.included_characters is None
    assert export.video_source == "stream"
    assert export.token_cap == 500
    assert export.token_used == 0
    assert export.package_url is None
    assert export.tier_at_export == "team"
    assert export.characters_included == 0
    assert export.character_status == []
    assert isinstance(export.created_at, datetime)


def test_scorm_export_custom_config():
    export = ScormExport.model_construct(
        partner_id="edu-org",
        content_id="def456",
        created_by="admin-user-2",
        export_token="tok_test_456",
        completion_rule="video_only",
        video_threshold_pct=90,
        quiz_pass_pct=60,
        included_characters=["Steve Jobs"],
        video_source="embedded",
        token_cap=1000,
        tier_at_export="organization",
    )
    assert export.completion_rule == "video_only"
    assert export.video_threshold_pct == 90
    assert export.included_characters == ["Steve Jobs"]
    assert export.video_source == "embedded"
    assert export.tier_at_export == "organization"


def test_scorm_export_character_status_tracking():
    export = ScormExport.model_construct(
        partner_id="test-org",
        content_id="ghi789",
        created_by="admin-3",
        export_token="tok_test_789",
        character_status=[
            CharacterExportStatus(
                name="Speaker 1",
                face_extracted=True,
                voice_cloned=True,
                qa_expanded=True,
                audio_generated=True,
                video_generated=False,
                fallback_reason="Lip-sync generation timed out",
            ),
            CharacterExportStatus(
                name="Speaker 2",
                face_extracted=False,
                fallback_reason="Audio-only content, no video frames",
            ),
        ],
    )
    assert len(export.character_status) == 2
    s1 = export.character_status[0]
    assert s1.face_extracted is True
    assert s1.video_generated is False
    assert s1.fallback_reason == "Lip-sync generation timed out"
    s2 = export.character_status[1]
    assert s2.face_extracted is False
    assert s2.fallback_reason == "Audio-only content, no video frames"
