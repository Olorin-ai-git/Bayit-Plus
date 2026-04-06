"""Tests for SCORM package builder and validator."""

import json
import zipfile
import pytest

from app.services.olorin.scorm_export.package_builder import (
    build_scorm_package,
    PackageBuildContext,
)
from app.services.olorin.scorm_export.scorm_validator import (
    validate_scorm_package,
    ScormValidationError,
)


def _make_context() -> PackageBuildContext:
    return PackageBuildContext(
        export_id="exp_test_1",
        content_id="content_123",
        content_title="Test Training Video",
        video_url="https://example.com/video.mp4",
        video_source="stream",
        export_token="tok_test_abc",
        api_base_url="https://api.olorin.ai",
        completion_rule="video_plus_quiz",
        video_threshold_pct=80,
        quiz_pass_pct=70,
        mastery_score=70,
        characters=[
            {
                "name": "Speaker 1",
                "profile_url": "",
                "qa_pairs": [
                    {
                        "question": "What is AI?",
                        "response_text": "AI is artificial intelligence.",
                        "topic": "expertise",
                        "difficulty": "basic",
                    }
                ],
                "chains": [],
            }
        ],
        media_files={},
    )


def test_build_scorm_package_creates_zip(tmp_path):
    ctx = _make_context()
    zip_path = tmp_path / "output.zip"
    build_scorm_package(ctx, str(zip_path))

    assert zip_path.exists()
    with zipfile.ZipFile(zip_path) as zf:
        names = zf.namelist()
        assert "imsmanifest.xml" in names
        assert "player/index.html" in names
        assert "player/player.js" in names
        assert "player/scorm-api.js" in names
        assert "player/character-engine.js" in names
        assert "player/styles.css" in names
        assert "content/manifest.json" in names
        assert "config.json" in names


def test_build_scorm_package_manifest_content(tmp_path):
    ctx = _make_context()
    zip_path = tmp_path / "output.zip"
    build_scorm_package(ctx, str(zip_path))

    with zipfile.ZipFile(zip_path) as zf:
        manifest_xml = zf.read("imsmanifest.xml").decode()
        assert "Test Training Video" in manifest_xml
        assert "schemaversion>1.2<" in manifest_xml
        assert "masteryscore>70<" in manifest_xml

        config = json.loads(zf.read("config.json"))
        assert config["export_token"] == "tok_test_abc"
        assert config["completion_rule"] == "video_plus_quiz"

        content_manifest = json.loads(zf.read("content/manifest.json"))
        assert content_manifest["content_id"] == "content_123"
        assert len(content_manifest["characters"]) == 1
        assert content_manifest["characters"][0]["name"] == "Speaker 1"


def test_validate_scorm_package_valid(tmp_path):
    ctx = _make_context()
    zip_path = tmp_path / "output.zip"
    build_scorm_package(ctx, str(zip_path))

    validate_scorm_package(str(zip_path))


def test_validate_scorm_package_missing_manifest(tmp_path):
    zip_path = tmp_path / "bad.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("player/index.html", "<html></html>")

    with pytest.raises(ScormValidationError, match="imsmanifest.xml"):
        validate_scorm_package(str(zip_path))
