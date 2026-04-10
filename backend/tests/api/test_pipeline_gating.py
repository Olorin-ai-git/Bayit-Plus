"""Tests for pipeline gating by Content.processing_state.

Covers:
- Viewer list excludes non-READY content (filter applied at query level).
- Admin list includes all content regardless of processing_state.
- Assignment creation rejects non-READY content with 409.
- Assignment creation allows READY content.
- Status endpoint exposes processing_state + stages[] payload.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.content import ProcessingState
from app.models.pipeline_stage import (
    StageExecution,
    StageName,
    StageStatus,
    SubtaskExecution,
)

pytest_plugins = ["conftest_training"]

pytestmark = pytest.mark.asyncio


def _fake_find_chain(items):
    """Build a MagicMock that mimics `Content.find(query).sort(...).to_list()`."""
    chain = MagicMock()
    chain.sort.return_value = chain
    chain.to_list = AsyncMock(return_value=items)
    return chain


class TestViewerContentGating:
    """GET /api/v1/training/content filtering by processing_state."""

    async def test_viewer_query_filters_by_ready_state(
        self, training_viewer_client
    ):
        """Viewer list query must include processing_state=READY."""
        captured_query: dict = {}

        def capture_find(query):
            captured_query.update(query)
            return _fake_find_chain([])

        with (
            patch(
                "app.api.routes.training.content.Content.find",
                side_effect=capture_find,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find",
                return_value=_fake_find_chain([]),
            ),
            patch(
                "app.api.routes.training.content.VideoChapters.get_for_content",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_viewer_client.get("/api/v1/training/content")

        assert resp.status_code == 200
        assert captured_query.get("partner_id") == "training-testorg-abc12345"
        assert captured_query.get("processing_state") == ProcessingState.READY

    async def test_admin_query_has_no_processing_state_filter(
        self, training_admin_client
    ):
        """Admin list query must NOT include a processing_state filter."""
        captured_query: dict = {}

        def capture_find(query):
            captured_query.update(query)
            return _fake_find_chain([])

        with (
            patch(
                "app.api.routes.training.content.Content.find",
                side_effect=capture_find,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find",
                return_value=_fake_find_chain([]),
            ),
            patch(
                "app.api.routes.training.content.VideoChapters.get_for_content",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.get("/api/v1/training/content")

        assert resp.status_code == 200
        assert captured_query.get("partner_id") == "training-testorg-abc12345"
        assert "processing_state" not in captured_query

    async def test_teacher_query_has_no_processing_state_filter(self):
        """Teacher list query must NOT include a processing_state filter.

        Teachers are staff (not trainees) and need to monitor ingest
        progress / retry failures, same as admins.
        """
        from httpx import ASGITransport, AsyncClient

        from app.api.routes.training.dependencies import (
            get_current_training_user,
        )
        from app.main import app

        mock_teacher = MagicMock()
        mock_teacher.id = "training_teacher_001"
        mock_teacher.email = "teacher@testorg.com"
        mock_teacher.role = "teacher"
        mock_teacher.partner_id = "training-testorg-abc12345"

        app.dependency_overrides[get_current_training_user] = lambda: mock_teacher
        try:
            captured_query: dict = {}

            def capture_find(query):
                captured_query.update(query)
                return _fake_find_chain([])

            with (
                patch(
                    "app.api.routes.training.content.Content.find",
                    side_effect=capture_find,
                ),
                patch(
                    "app.api.routes.training.content.IngestJob.find",
                    return_value=_fake_find_chain([]),
                ),
                patch(
                    "app.api.routes.training.content.VideoChapters.get_for_content",
                    new_callable=AsyncMock,
                    return_value=None,
                ),
            ):
                async with AsyncClient(
                    transport=ASGITransport(app=app),
                    base_url="http://test",
                ) as ac:
                    resp = await ac.get("/api/v1/training/content")
        finally:
            app.dependency_overrides.pop(get_current_training_user, None)

        assert resp.status_code == 200
        assert captured_query.get("partner_id") == "training-testorg-abc12345"
        assert "processing_state" not in captured_query


class TestAssignmentGating:
    """POST /api/v1/training/assignments gating by Content.processing_state."""

    async def test_cannot_assign_processing_content(
        self, training_admin_client
    ):
        """Assignment creation returns 409 when content is still processing."""
        processing_content = MagicMock()
        processing_content.processing_state = ProcessingState.PROCESSING
        processing_content.partner_id = "training-testorg-abc12345"

        with (
            patch(
                "app.api.routes.training.assignments.Content.get",
                new_callable=AsyncMock,
                return_value=processing_content,
            ),
            patch(
                "app.api.routes.training.assignments.TrainingAssignment.find_one",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/assignments",
                json={
                    "content_id": "507f1f77bcf86cd799439011",
                    "assigned_to": ["u1"],
                },
            )

        assert resp.status_code == 409
        assert "processing" in resp.json()["detail"].lower()

    async def test_cannot_assign_failed_content(
        self, training_admin_client
    ):
        """Assignment creation returns 409 when content pipeline failed."""
        failed_content = MagicMock()
        failed_content.processing_state = ProcessingState.FAILED
        failed_content.partner_id = "training-testorg-abc12345"

        with (
            patch(
                "app.api.routes.training.assignments.Content.get",
                new_callable=AsyncMock,
                return_value=failed_content,
            ),
            patch(
                "app.api.routes.training.assignments.TrainingAssignment.find_one",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/assignments",
                json={
                    "content_id": "507f1f77bcf86cd799439011",
                    "assigned_to": ["u1"],
                },
            )

        assert resp.status_code == 409
        assert "failed" in resp.json()["detail"].lower()

    async def test_assignment_returns_404_for_malformed_content_id(
        self, training_admin_client
    ):
        """Malformed ObjectId is rejected as 404 (not 500/422)."""
        resp = await training_admin_client.post(
            "/api/v1/training/assignments",
            json={
                "content_id": "not-a-valid-objectid",
                "assigned_to": ["u1"],
            },
        )
        assert resp.status_code == 404

    async def test_assignment_returns_404_when_content_missing(
        self, training_admin_client
    ):
        """Assignment creation returns 404 when content does not exist."""
        with (
            patch(
                "app.api.routes.training.assignments.Content.get",
                new_callable=AsyncMock,
                return_value=None,
            ),
            patch(
                "app.api.routes.training.assignments.TrainingAssignment.find_one",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/assignments",
                json={
                    "content_id": "507f1f77bcf86cd799439011",
                    "assigned_to": ["u1"],
                },
            )

        assert resp.status_code == 404

    async def test_can_assign_ready_content(
        self, training_admin_client
    ):
        """Assignment creation succeeds when content is READY."""
        ready_content = MagicMock()
        ready_content.processing_state = ProcessingState.READY
        ready_content.partner_id = "training-testorg-abc12345"

        mock_assignment = MagicMock()
        mock_assignment.id = "assign_123"
        mock_assignment.content_id = "507f1f77bcf86cd799439011"
        mock_assignment.assigned_to = ["u1"]
        mock_assignment.required = False
        mock_assignment.due_date = None
        mock_assignment.tags = []
        mock_assignment.format_id = None
        mock_assignment.created_by = "training_admin_001"
        from datetime import datetime, timezone
        mock_assignment.created_at = datetime.now(timezone.utc)
        mock_assignment.insert = AsyncMock()

        with (
            patch(
                "app.api.routes.training.assignments.Content.get",
                new_callable=AsyncMock,
                return_value=ready_content,
            ),
            patch(
                "app.api.routes.training.assignments.TrainingAssignment"
            ) as mock_cls,
        ):
            mock_cls.find_one = AsyncMock(return_value=None)
            mock_cls.return_value = mock_assignment
            resp = await training_admin_client.post(
                "/api/v1/training/assignments",
                json={
                    "content_id": "507f1f77bcf86cd799439011",
                    "assigned_to": ["u1"],
                },
            )

        assert resp.status_code == 201


class TestContentStatusEndpoint:
    """GET /api/v1/training/content/{id}/status stage enrichment."""

    async def test_status_returns_processing_state_and_stages(
        self, training_admin_client
    ):
        """Status endpoint returns processing_state + full stages payload."""
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.PROCESSING

        # Build a realistic stages list: one completed, one running with
        # mixed subtask outcomes.
        transcription = StageExecution(
            name=StageName.TRANSCRIPTION,
            status=StageStatus.COMPLETED,
        )
        voice_cloning = StageExecution(
            name=StageName.VOICE_CLONING,
            status=StageStatus.RUNNING,
            subtasks={
                "alice": SubtaskExecution(
                    name="alice", status=StageStatus.COMPLETED,
                ),
                "bob": SubtaskExecution(
                    name="bob",
                    status=StageStatus.FAILED,
                    error="elevenlabs 429",
                    retry_count=1,
                ),
            },
        )
        job = MagicMock()
        job.job_id = "j-cs-1"
        job.overall_status = "processing"
        job.capabilities = {"characters": "completed"}
        job.stages = [transcription, voice_cloning]

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=job,
            ),
        ):
            resp = await training_admin_client.get(
                "/api/v1/training/content/507f1f77bcf86cd799439011/status"
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["content_id"] == "507f1f77bcf86cd799439011"
        assert body["processing_state"] == "processing"
        assert body["job_id"] == "j-cs-1"
        assert body["capabilities"] == {"characters": "completed"}
        assert isinstance(body["stages"], list)
        assert len(body["stages"]) == 2

        stages_by_name = {s["name"]: s for s in body["stages"]}
        assert stages_by_name["transcription"]["status"] == "completed"
        vc = stages_by_name["voice_cloning"]
        assert vc["status"] == "running"
        assert vc["subtasks"]["alice"]["status"] == "completed"
        assert vc["subtasks"]["bob"]["status"] == "failed"
        assert vc["subtasks"]["bob"]["error"] == "elevenlabs 429"
        assert vc["subtasks"]["bob"]["retry_count"] == 1

    async def test_status_returns_empty_stages_when_no_job(
        self, training_admin_client
    ):
        """When no IngestJob exists, stages is [] and state mirrors Content."""
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.READY

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.get(
                "/api/v1/training/content/507f1f77bcf86cd799439011/status"
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["processing_state"] == "ready"
        assert body["stages"] == []
        assert body["job_id"] is None

    async def test_status_no_job_mirrors_non_ready_processing_state(
        self, training_admin_client
    ):
        """When no job exists and content is FAILED, status must not say 'ready'.

        Guards against the contradictory shape where processing_state=FAILED
        but status=ready, which would hide the retry CTA in the admin UI.
        """
        failed_content = MagicMock()
        failed_content.partner_id = "training-testorg-abc12345"
        failed_content.processing_state = ProcessingState.FAILED

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=failed_content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.get(
                "/api/v1/training/content/507f1f77bcf86cd799439011/status"
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["processing_state"] == "failed"
        assert body["status"] != "ready"
        assert body["status"] == "failed"
        assert body["job_id"] is None
        assert body["stages"] == []

    async def test_status_returns_404_for_malformed_content_id(
        self, training_admin_client
    ):
        """Malformed ObjectId is rejected as 404, not 500."""
        resp = await training_admin_client.get(
            "/api/v1/training/content/not-a-valid-oid/status"
        )
        assert resp.status_code == 404

    async def test_status_returns_404_for_wrong_partner(
        self, training_admin_client
    ):
        """Content owned by a different partner is 404 (no existence leak)."""
        other_partner_content = MagicMock()
        other_partner_content.partner_id = "training-otherorg-xyz"
        other_partner_content.processing_state = ProcessingState.READY

        with patch(
            "app.api.routes.training.content.Content.get",
            new_callable=AsyncMock,
            return_value=other_partner_content,
        ):
            resp = await training_admin_client.get(
                "/api/v1/training/content/507f1f77bcf86cd799439011/status"
            )

        assert resp.status_code == 404


class TestRetryEndpoint:
    """POST /api/v1/training/content/{id}/retry stage + subtask params."""

    async def _patch_content_and_job(self, job):
        """Helper: mock Content.get + IngestJob.find_one for the retry route."""
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.FAILED
        content.save = AsyncMock()
        return content

    async def test_retry_without_params_resumes_existing_job(
        self, training_admin_client
    ):
        """No params + existing job -> resume_pipeline dispatched."""
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.FAILED
        content.save = AsyncMock()

        existing_job = MagicMock()
        existing_job.job_id = "job-abc"
        existing_job.overall_status = "failed"

        called = {}

        async def fake_resume(job):
            called["resumed_job_id"] = job.job_id

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=existing_job,
            ),
            patch(
                "app.api.routes.training.content.resume_pipeline",
                side_effect=fake_resume,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011/retry"
            )

        assert resp.status_code == 202
        assert resp.json()["job_id"] == "job-abc"
        # BackgroundTasks runs after the response; await it by flushing:
        # since TestClient/AsyncClient does actually run background tasks
        # synchronously after the response, called should have been populated.
        assert called.get("resumed_job_id") == "job-abc"

    async def test_retry_with_stage_param(self, training_admin_client):
        """?stage=voice_cloning -> retry_stage dispatched with enum."""
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.FAILED
        content.save = AsyncMock()

        existing_job = MagicMock()
        existing_job.job_id = "job-xyz"
        existing_job.overall_status = "failed"

        called = {}

        async def fake_retry_stage(job, stage_name):
            called["job_id"] = job.job_id
            called["stage"] = stage_name

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=existing_job,
            ),
            patch(
                "app.api.routes.training.content.retry_stage",
                side_effect=fake_retry_stage,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011/retry"
                "?stage=voice_cloning"
            )

        assert resp.status_code == 202
        assert called["stage"] == StageName.VOICE_CLONING
        assert called["job_id"] == "job-xyz"

    async def test_retry_with_stage_and_subtask(self, training_admin_client):
        """?stage=X&subtask=Y -> retry_subtask dispatched."""
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.FAILED
        content.save = AsyncMock()

        existing_job = MagicMock()
        existing_job.job_id = "job-sub"
        existing_job.overall_status = "failed"

        called = {}

        async def fake_retry_subtask(job, stage_name, subtask):
            called["job_id"] = job.job_id
            called["stage"] = stage_name
            called["subtask"] = subtask

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=existing_job,
            ),
            patch(
                "app.api.routes.training.content.retry_subtask",
                side_effect=fake_retry_subtask,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011/retry"
                "?stage=voice_cloning&subtask=bob"
            )

        assert resp.status_code == 202
        assert called["stage"] == StageName.VOICE_CLONING
        assert called["subtask"] == "bob"

    async def test_retry_rejects_invalid_stage_name(
        self, training_admin_client
    ):
        """Unknown stage name -> 400."""
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.FAILED
        content.save = AsyncMock()

        existing_job = MagicMock()
        existing_job.job_id = "job-bad"

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=existing_job,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011/retry"
                "?stage=not_a_real_stage"
            )

        assert resp.status_code == 400

    async def test_retry_rejects_subtask_without_stage(
        self, training_admin_client
    ):
        """subtask= without stage= -> 400 (ambiguous target)."""
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.FAILED
        content.save = AsyncMock()

        existing_job = MagicMock()

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=existing_job,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011/retry"
                "?subtask=bob"
            )

        assert resp.status_code == 400

    async def test_retry_returns_404_for_malformed_content_id(
        self, training_admin_client
    ):
        resp = await training_admin_client.post(
            "/api/v1/training/content/not-an-oid/retry"
        )
        assert resp.status_code == 404

    async def test_retry_returns_404_when_content_missing(
        self, training_admin_client
    ):
        with patch(
            "app.api.routes.training.content.Content.get",
            new_callable=AsyncMock,
            return_value=None,
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011/retry"
            )
        assert resp.status_code == 404

    async def test_retry_returns_404_when_no_ingest_job_exists(
        self, training_admin_client
    ):
        """Legacy content rows without an IngestJob cannot be resumed — 404.

        Pre-Task-7 content (or manually-created rows that never went through
        /ingest) lack the stage tracking that resume_pipeline needs. Admins
        must re-ingest to get a fresh job. Guards against the "stuck in
        processing forever" failure mode where we'd flip state but have
        nothing to resume.
        """
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.READY
        content.save = AsyncMock()

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=None,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011/retry"
            )

        assert resp.status_code == 404
        assert "ingest job" in resp.json()["detail"].lower()
        # processing_state must NOT be flipped — we never dispatched any work.
        content.save.assert_not_awaited()

    async def test_retry_sets_processing_state_back_to_processing(
        self, training_admin_client
    ):
        """Pressing retry must flip Content.processing_state back to PROCESSING
        so the admin UI stops showing the FAILED badge immediately."""
        content = MagicMock()
        content.partner_id = "training-testorg-abc12345"
        content.processing_state = ProcessingState.FAILED
        content.save = AsyncMock()

        existing_job = MagicMock()
        existing_job.job_id = "job-flip"
        existing_job.overall_status = "failed"

        async def noop_resume(job):
            pass

        with (
            patch(
                "app.api.routes.training.content.Content.get",
                new_callable=AsyncMock,
                return_value=content,
            ),
            patch(
                "app.api.routes.training.content.IngestJob.find_one",
                new_callable=AsyncMock,
                return_value=existing_job,
            ),
            patch(
                "app.api.routes.training.content.resume_pipeline",
                side_effect=noop_resume,
            ),
        ):
            resp = await training_admin_client.post(
                "/api/v1/training/content/507f1f77bcf86cd799439011/retry"
            )

        assert resp.status_code == 202
        # processing_state was flipped before the background task fired
        assert content.processing_state == ProcessingState.PROCESSING
        content.save.assert_awaited()
