"""Tests for B2BContentSource model and API logic (Phase H1)."""

import pytest

from app.models.b2b_content_source import B2BContentSource, SOURCE_TYPES


class TestSourceTypes:
    """Valid source type constants."""

    def test_youtube_channel(self):
        assert "youtube_channel" in SOURCE_TYPES

    def test_playlist(self):
        assert "playlist" in SOURCE_TYPES

    def test_rss(self):
        assert "rss" in SOURCE_TYPES

    def test_manual(self):
        assert "manual" in SOURCE_TYPES

    def test_count(self):
        assert len(SOURCE_TYPES) == 4


class TestB2BContentSourceModel:
    """Model settings and defaults."""

    def test_collection_name(self):
        assert B2BContentSource.Settings.name == "b2b_content_sources"

    def test_indexes(self):
        assert "partner_id" in B2BContentSource.Settings.indexes
        assert "source_type" in B2BContentSource.Settings.indexes

    def test_default_capabilities(self):
        # Verify default_factory produces correct defaults
        defaults = B2BContentSource.model_fields["capabilities"].default_factory()
        assert defaults == ["characters", "subtitles"]

    def test_default_sync_interval(self):
        default = B2BContentSource.model_fields["sync_interval_hours"].default
        assert default == 24

    def test_default_status(self):
        default = B2BContentSource.model_fields["status"].default
        assert default == "active"

    def test_default_auto_process(self):
        default = B2BContentSource.model_fields["auto_process"].default
        assert default is True


class TestSourceResponseMapping:
    """Response model construction from source_to_response."""

    def test_import_response_models(self):
        from app.api.routes.olorin.b2b_source_schemas import (
            CreateSourceRequest,
            SourceListResponse,
            SourceResponse,
            SyncResponse,
        )
        assert SourceResponse is not None
        assert SourceListResponse is not None
        assert CreateSourceRequest is not None
        assert SyncResponse is not None

    def test_create_request_validation(self):
        from app.api.routes.olorin.b2b_source_schemas import CreateSourceRequest

        req = CreateSourceRequest(
            source_type="youtube_channel",
            source_url="https://youtube.com/@channel",
            name="My Channel",
        )
        assert req.source_type == "youtube_channel"
        assert req.auto_process is True
        assert req.capabilities == ["characters", "subtitles"]
        assert req.sync_interval_hours == 24

    def test_create_request_custom_values(self):
        from app.api.routes.olorin.b2b_source_schemas import CreateSourceRequest

        req = CreateSourceRequest(
            source_type="rss",
            source_url="https://example.com/feed.xml",
            name="RSS Feed",
            auto_process=False,
            capabilities=["characters", "trivia", "search"],
            sync_interval_hours=12,
        )
        assert req.auto_process is False
        assert len(req.capabilities) == 3
        assert req.sync_interval_hours == 12

    def test_sync_response_fields(self):
        from app.api.routes.olorin.b2b_source_schemas import SyncResponse

        resp = SyncResponse(
            source_id="abc123",
            status="completed",
            message="Synced 5 new video(s)",
        )
        assert resp.source_id == "abc123"
        assert resp.status == "completed"
        assert "5" in resp.message
