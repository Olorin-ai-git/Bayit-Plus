"""Unit tests for ConsumerSubmission model."""

import pytest


class TestConsumerSubmissionModel:
    def test_model_fields(self):
        from app.models.consumer_submission import ConsumerSubmission
        sub = ConsumerSubmission.model_construct(
            url="https://www.youtube.com/watch?v=abc123",
            fingerprint="fp-test-uuid-1234",
            status="pending",
        )
        assert sub.url == "https://www.youtube.com/watch?v=abc123"
        assert sub.fingerprint == "fp-test-uuid-1234"
        assert sub.status == "pending"
        assert sub.content_id is None
        assert sub.error is None

    def test_job_id_auto_generated(self):
        from app.models.consumer_submission import ConsumerSubmission
        sub1 = ConsumerSubmission.model_construct(
            url="https://example.com/video.mp4", fingerprint="fp1",
        )
        sub2 = ConsumerSubmission.model_construct(
            url="https://example.com/video.mp4", fingerprint="fp2",
        )
        assert sub1.job_id != sub2.job_id
        assert len(sub1.job_id) > 8

    def test_default_status_is_pending(self):
        from app.models.consumer_submission import ConsumerSubmission
        sub = ConsumerSubmission.model_construct(
            url="https://example.com/v.mp4", fingerprint="fp",
        )
        assert sub.status == "pending"

    def test_optional_email(self):
        from app.models.consumer_submission import ConsumerSubmission
        sub = ConsumerSubmission.model_construct(
            url="https://example.com/v.mp4", fingerprint="fp",
            email="user@example.com",
        )
        assert sub.email == "user@example.com"


class TestConsumerSubmissionConfig:
    def test_max_submissions_config_exists(self):
        from app.core.config import Settings
        s = Settings()
        assert hasattr(s, "CONSUMER_DEMO_MAX_SUBMISSIONS")
        assert s.CONSUMER_DEMO_MAX_SUBMISSIONS == 3

    def test_consumer_demo_ttl_hours_exists(self):
        from app.core.config import Settings
        s = Settings()
        assert hasattr(s, "CONSUMER_DEMO_TTL_HOURS")
        assert s.CONSUMER_DEMO_TTL_HOURS == 24
