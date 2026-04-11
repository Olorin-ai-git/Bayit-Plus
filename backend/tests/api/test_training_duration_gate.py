"""Unit tests for per-tier video duration gate in the ingest orchestrator."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.asyncio


def _make_job(caps: list[str] | None = None) -> MagicMock:
    job = MagicMock()
    job.job_id = "job_test_001"
    job.partner_id = "training-testorg-abc12345"
    job.content_id = "content_001"
    job.video_url = "https://www.youtube.com/watch?v=longvideo"
    job.direct = True
    job.capabilities = {c: "pending" for c in (caps or ["characters", "subtitles"])}
    job.error_detail = None
    job.save = AsyncMock()
    return job


def _make_content() -> MagicMock:
    content = MagicMock()
    content.id = "content_001"
    content.title = "Test Video"
    content.transcript = None
    content.transcript_segments = []
    content.save = AsyncMock()
    return content


def _make_partner(tier: str = "trial") -> MagicMock:
    partner = MagicMock()
    partner.partner_id = "training-testorg-abc12345"
    tc = MagicMock()
    tc.org_tier = tier
    partner.training_config = tc
    return partner


class TestDurationGate:

    async def test_trial_video_over_limit_fails_all_capabilities(self):
        """A 45-minute video on a trial org raises DurationLimitExceeded."""
        from app.services.olorin.ingest_orchestrator import (
            DurationLimitExceeded,
            _run_transcription,
        )

        job = _make_job()
        content = _make_content()
        partner = _make_partner(tier="trial")  # limit: 1800s (30 min)

        transcript_result = MagicMock()
        transcript_result.full_text = "some transcript"
        transcript_result.segments = []
        transcript_result.duration_seconds = 2700.0  # 45 minutes -- over 30-min limit

        with patch(
            "app.services.olorin.ingest_orchestrator.transcribe_video",
            new_callable=AsyncMock,
            return_value=transcript_result,
        ):
            with pytest.raises(DurationLimitExceeded):
                await _run_transcription(job, content, partner)

        assert "too long" in (job.error_detail or "").lower()
        assert all(v == "failed" for v in job.capabilities.values())

    async def test_trial_video_within_limit_passes(self):
        """A 20-minute video on a trial org proceeds normally."""
        from app.services.olorin.ingest_orchestrator import _run_transcription

        job = _make_job()
        content = _make_content()
        partner = _make_partner(tier="trial")

        transcript_result = MagicMock()
        transcript_result.full_text = "some transcript"
        transcript_result.segments = []
        transcript_result.duration_seconds = 1200.0  # 20 minutes -- within limit

        with patch(
            "app.services.olorin.ingest_orchestrator.transcribe_video",
            new_callable=AsyncMock,
            return_value=transcript_result,
        ):
            result = await _run_transcription(job, content, partner)

        assert result == "some transcript"
        assert job.error_detail is None

    async def test_team_tier_enforces_2h_limit(self):
        """A 3-hour video on a team-tier org raises DurationLimitExceeded."""
        from app.services.olorin.ingest_orchestrator import (
            DurationLimitExceeded,
            _run_transcription,
        )

        job = _make_job()
        content = _make_content()
        partner = _make_partner(tier="team")  # limit: 7200s (2 hours)

        transcript_result = MagicMock()
        transcript_result.full_text = "some transcript"
        transcript_result.segments = []
        transcript_result.duration_seconds = 10800.0  # 3 hours

        with patch(
            "app.services.olorin.ingest_orchestrator.transcribe_video",
            new_callable=AsyncMock,
            return_value=transcript_result,
        ):
            with pytest.raises(DurationLimitExceeded):
                await _run_transcription(job, content, partner)

        assert "too long" in (job.error_detail or "").lower()

    async def test_organization_tier_has_no_duration_limit(self):
        """A 3-hour video on an organization-tier org passes (limit=0 = unlimited)."""
        from app.services.olorin.ingest_orchestrator import _run_transcription

        job = _make_job()
        content = _make_content()
        partner = _make_partner(tier="organization")

        transcript_result = MagicMock()
        transcript_result.full_text = "some transcript"
        transcript_result.segments = []
        transcript_result.duration_seconds = 10800.0  # 3 hours

        with patch(
            "app.services.olorin.ingest_orchestrator.transcribe_video",
            new_callable=AsyncMock,
            return_value=transcript_result,
        ):
            result = await _run_transcription(job, content, partner)

        assert result == "some transcript"
        assert job.error_detail is None

    async def test_transcription_failure_still_returns_empty(self):
        """If transcribe_video raises RuntimeError, _run_transcription propagates it."""
        from app.services.olorin.ingest_orchestrator import _run_transcription

        job = _make_job()
        content = _make_content()
        partner = _make_partner(tier="trial")

        with patch(
            "app.services.olorin.ingest_orchestrator.transcribe_video",
            new_callable=AsyncMock,
            side_effect=RuntimeError("ElevenLabs timeout"),
        ):
            with pytest.raises(RuntimeError, match="ElevenLabs timeout"):
                await _run_transcription(job, content, partner)

        # Transcription failure does NOT set a duration-based error_detail
        assert "too long" not in (job.error_detail or "")
