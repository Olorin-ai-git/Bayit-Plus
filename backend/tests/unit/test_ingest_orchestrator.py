"""Tests for IngestJob model and orchestrator logic (Phase G1+G3)."""

import pytest

from app.models.ingest_job import IngestJob, derive_overall_status
from app.services.olorin.ingest_orchestrator import (
    ALL_CAPABILITIES,
    _expand_capabilities,
)


class TestExpandCapabilities:
    """Capability list expansion."""

    def test_all_expands(self):
        result = _expand_capabilities(["all"])
        assert result == list(ALL_CAPABILITIES)

    def test_specific_caps_preserved(self):
        result = _expand_capabilities(["characters", "trivia"])
        assert result == ["characters", "trivia"]

    def test_unknown_caps_filtered(self):
        result = _expand_capabilities(["characters", "bogus"])
        assert result == ["characters"]

    def test_empty_list(self):
        result = _expand_capabilities([])
        assert result == []

    def test_all_overrides_specifics(self):
        result = _expand_capabilities(["characters", "all", "trivia"])
        assert result == list(ALL_CAPABILITIES)

    def test_all_capabilities_tuple(self):
        assert "characters" in ALL_CAPABILITIES
        assert "subtitles" in ALL_CAPABILITIES
        assert "trivia" in ALL_CAPABILITIES
        assert "search" in ALL_CAPABILITIES
        assert len(ALL_CAPABILITIES) == 4


class TestDeriveOverallStatus:
    """Status derivation from per-capability map."""

    def test_all_pending(self):
        assert derive_overall_status({
            "characters": "pending",
            "subtitles": "pending",
        }) == "processing"

    def test_all_completed(self):
        assert derive_overall_status({
            "characters": "completed",
            "subtitles": "completed",
        }) == "completed"

    def test_all_failed(self):
        assert derive_overall_status({
            "characters": "failed",
            "subtitles": "failed",
        }) == "failed"

    def test_partial(self):
        assert derive_overall_status({
            "characters": "completed",
            "subtitles": "failed",
        }) == "partial"

    def test_processing(self):
        assert derive_overall_status({
            "characters": "processing",
            "subtitles": "completed",
        }) == "processing"

    def test_empty(self):
        assert derive_overall_status({}) == "pending"

    def test_single_completed(self):
        assert derive_overall_status({
            "characters": "completed",
        }) == "completed"

    def test_single_failed(self):
        assert derive_overall_status({
            "trivia": "failed",
        }) == "failed"

    def test_pending_with_completed(self):
        assert derive_overall_status({
            "characters": "completed",
            "subtitles": "pending",
        }) == "processing"

    def test_all_four_completed(self):
        assert derive_overall_status({
            "characters": "completed",
            "subtitles": "completed",
            "trivia": "completed",
            "search": "completed",
        }) == "completed"

    def test_three_completed_one_failed(self):
        assert derive_overall_status({
            "characters": "completed",
            "subtitles": "completed",
            "trivia": "completed",
            "search": "failed",
        }) == "partial"


class TestIngestJobModelMeta:
    """IngestJob settings and collection config."""

    def test_collection_name(self):
        assert IngestJob.Settings.name == "ingest_jobs"

    def test_indexes(self):
        assert "job_id" in IngestJob.Settings.indexes
        assert "partner_id" in IngestJob.Settings.indexes
