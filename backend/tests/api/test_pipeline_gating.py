"""Tests for pipeline gating by Content.processing_state.

Covers:
- Viewer list excludes non-READY content (filter applied at query level).
- Admin list includes all content regardless of processing_state.
- Assignment creation rejects non-READY content with 409.
- Assignment creation allows READY content.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.content import ProcessingState

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
