"""Tests for B2B video upload endpoint (Phase F2)."""

import pytest

from app.api.routes.olorin.video_upload import (
    _ALLOWED_CONTENT_TYPES,
    _EXT_MAP,
    UploadResponse,
)


class TestContentTypeValidation:
    """Upload endpoint content type gate."""

    def test_mp4_allowed(self):
        assert "video/mp4" in _ALLOWED_CONTENT_TYPES

    def test_webm_allowed(self):
        assert "video/webm" in _ALLOWED_CONTENT_TYPES

    def test_quicktime_allowed(self):
        assert "video/quicktime" in _ALLOWED_CONTENT_TYPES

    def test_audio_mpeg_allowed(self):
        assert "audio/mpeg" in _ALLOWED_CONTENT_TYPES

    def test_text_html_rejected(self):
        assert "text/html" not in _ALLOWED_CONTENT_TYPES

    def test_application_json_rejected(self):
        assert "application/json" not in _ALLOWED_CONTENT_TYPES

    def test_image_png_rejected(self):
        assert "image/png" not in _ALLOWED_CONTENT_TYPES


class TestExtensionMap:
    """File extension derivation from content type."""

    def test_mp4_ext(self):
        assert _EXT_MAP["video/mp4"] == "mp4"

    def test_webm_ext(self):
        assert _EXT_MAP["video/webm"] == "webm"

    def test_quicktime_ext(self):
        assert _EXT_MAP["video/quicktime"] == "mov"

    def test_avi_ext(self):
        assert _EXT_MAP["video/x-msvideo"] == "avi"

    def test_mkv_ext(self):
        assert _EXT_MAP["video/x-matroska"] == "mkv"

    def test_audio_mp3_ext(self):
        assert _EXT_MAP["audio/mpeg"] == "mp3"

    def test_all_allowed_types_have_ext(self):
        for ct in _ALLOWED_CONTENT_TYPES:
            assert ct in _EXT_MAP, f"Missing ext mapping for {ct}"


class TestUploadResponse:
    """Response model validation."""

    def test_response_fields(self):
        resp = UploadResponse(
            url="https://storage.googleapis.com/bucket/path.mp4",
            file_id="abc123",
            size_bytes=1024,
            content_type="video/mp4",
        )
        assert resp.url.startswith("https://")
        assert resp.file_id == "abc123"
        assert resp.size_bytes == 1024
        assert resp.content_type == "video/mp4"

    def test_response_serialization(self):
        resp = UploadResponse(
            url="https://example.com/v.mp4",
            file_id="def456",
            size_bytes=2048,
            content_type="video/webm",
        )
        data = resp.model_dump()
        assert "url" in data
        assert "file_id" in data
        assert "size_bytes" in data
        assert "content_type" in data
