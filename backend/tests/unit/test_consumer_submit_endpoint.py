"""Unit tests for consumer URL submission endpoint."""

import pytest


class TestSubmitUrlRequestValidation:
    def test_request_model_fields(self):
        from app.api.routes.consumer_submit import SubmitUrlRequest
        req = SubmitUrlRequest(
            url="https://www.youtube.com/watch?v=abc",
            fingerprint="fp-12345678",
        )
        assert req.url == "https://www.youtube.com/watch?v=abc"
        assert req.fingerprint == "fp-12345678"
        assert req.email is None

    def test_fingerprint_min_length(self):
        from app.api.routes.consumer_submit import SubmitUrlRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SubmitUrlRequest(url="https://youtube.com/watch?v=x", fingerprint="short")

    def test_url_min_length(self):
        from app.api.routes.consumer_submit import SubmitUrlRequest
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SubmitUrlRequest(url="short", fingerprint="fp-12345678")


class TestSubmitUrlResponse:
    def test_response_model(self):
        from app.api.routes.consumer_submit import SubmitUrlResponse
        resp = SubmitUrlResponse(job_id="abc123def456", status="pending")
        assert resp.job_id == "abc123def456"
        assert resp.status == "pending"


class TestSubmissionStatusResponse:
    def test_ready_response(self):
        from app.api.routes.consumer_submit import SubmissionStatusResponse
        resp = SubmissionStatusResponse(
            job_id="abc123",
            status="ready",
            content_id="67890",
            video_title="Back to the Future",
            character_count=5,
        )
        assert resp.status == "ready"
        assert resp.character_count == 5

    def test_failed_response_with_error(self):
        from app.api.routes.consumer_submit import SubmissionStatusResponse
        resp = SubmissionStatusResponse(
            job_id="abc123",
            status="failed",
            error="Could not find in TMDB",
        )
        assert resp.error == "Could not find in TMDB"


class TestRateLimitKeys:
    def test_consumer_demo_submit_key_exists(self):
        from app.core.rate_limiter import RATE_LIMITS
        assert "consumer_demo_submit" in RATE_LIMITS

    def test_consumer_demo_status_key_exists(self):
        from app.core.rate_limiter import RATE_LIMITS
        assert "consumer_demo_status" in RATE_LIMITS
