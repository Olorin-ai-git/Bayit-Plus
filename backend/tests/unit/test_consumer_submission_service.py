"""Unit tests for ConsumerSubmissionService."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


class TestSubmitUrlValidation:
    @pytest.mark.asyncio
    async def test_invalid_url_raises(self):
        from app.services.consumer_submission_service import (
            ConsumerSubmissionService, InvalidVideoUrl,
        )
        svc = ConsumerSubmissionService()
        with pytest.raises(InvalidVideoUrl):
            await svc.submit_url(
                url="ftp://bad.com/video",
                fingerprint="fp-123456789",
            )

    @pytest.mark.asyncio
    async def test_submission_limit_checked(self):
        from app.services.consumer_submission_service import (
            ConsumerSubmissionService, SubmissionLimitReached,
        )
        svc = ConsumerSubmissionService()
        with patch(
            "app.services.consumer_submission_service.ConsumerSubmission"
        ) as MockModel:
            mock_query = MagicMock()
            mock_query.count = AsyncMock(return_value=3)
            MockModel.find.return_value = mock_query
            with pytest.raises(SubmissionLimitReached):
                await svc.submit_url(
                    url="https://www.youtube.com/watch?v=abc",
                    fingerprint="fp-full12345",
                    max_submissions=3,
                )


class TestExtractionOrchestration:
    @pytest.mark.asyncio
    async def test_run_extraction_updates_status(self):
        from app.services.consumer_submission_service import (
            ConsumerSubmissionService,
        )
        svc = ConsumerSubmissionService()
        mock_sub = MagicMock()
        mock_sub.url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        mock_sub.job_id = "test-job-123"
        mock_sub.save = AsyncMock()

        with patch.object(
            svc, "_extract_title",
            new_callable=AsyncMock,
            return_value="Never Gonna Give You Up",
        ), patch.object(
            svc, "_search_tmdb",
            new_callable=AsyncMock,
            return_value={"id": 12345, "title": "Never Gonna Give You Up"},
        ), patch.object(
            svc, "_create_content_and_extract",
            new_callable=AsyncMock,
            return_value=("content-id-1", 3),
        ):
            await svc.run_extraction(mock_sub)
            assert mock_sub.status == "ready"
            assert mock_sub.content_id == "content-id-1"
            assert mock_sub.character_count == 3

    @pytest.mark.asyncio
    async def test_tmdb_not_found_fails_gracefully(self):
        from app.services.consumer_submission_service import (
            ConsumerSubmissionService,
        )
        svc = ConsumerSubmissionService()
        mock_sub = MagicMock()
        mock_sub.url = "https://cdn.example.com/obscure.mp4"
        mock_sub.job_id = "test-job-456"
        mock_sub.save = AsyncMock()

        with patch.object(
            svc, "_extract_title",
            new_callable=AsyncMock,
            return_value=None,
        ), patch.object(
            svc, "_search_tmdb",
            new_callable=AsyncMock,
            return_value=None,
        ):
            await svc.run_extraction(mock_sub)
            assert mock_sub.status == "failed"
            assert "TMDB" in (mock_sub.error or "")
