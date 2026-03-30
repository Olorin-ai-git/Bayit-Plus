"""
Consumer Submission Service

Orchestrates the consumer URL submission pipeline:
validate URL -> extract title -> TMDB search -> Content creation -> character extraction.
"""

from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.consumer_submission import ConsumerSubmission
from app.services.consumer_extraction_pipeline import (
    run_extraction as _run_extraction,
)
from app.utils.video_url_utils import validate_video_url

logger = get_logger(__name__)


class InvalidVideoUrl(Exception):
    def __init__(self, reason: str):
        self.reason = reason


class SubmissionLimitReached(Exception):
    def __init__(self, current: int, maximum: int):
        self.current = current
        self.maximum = maximum


class ConsumerSubmissionService:
    """Manages the consumer URL submission lifecycle."""

    async def submit_url(
        self,
        url: str,
        fingerprint: str,
        email: Optional[str] = None,
        max_submissions: int = settings.CONSUMER_DEMO_MAX_SUBMISSIONS,
        priority: int = 10,
        source_tier: str = "free",
    ) -> ConsumerSubmission:
        """Validate URL, check limits, create submission record."""
        is_valid, err = validate_video_url(url)
        if not is_valid:
            raise InvalidVideoUrl(err)

        count = await ConsumerSubmission.find(
            ConsumerSubmission.fingerprint == fingerprint,
        ).count()
        if count >= max_submissions:
            raise SubmissionLimitReached(count, max_submissions)

        submission = ConsumerSubmission(
            url=url.strip(),
            fingerprint=fingerprint,
            email=email,
            priority=priority,
            source_tier=source_tier,
        )
        await submission.insert()
        logger.info(
            "Consumer submission created",
            extra={"job_id": submission.job_id, "url": url},
        )
        return submission

    async def submit_url_for_user(
        self,
        url: str,
        user_id: str,
        email: Optional[str] = None,
        max_submissions: int = 3,
        priority: int = 10,
        source_tier: str = "free",
    ) -> ConsumerSubmission:
        """Validate URL, check per-user limits, create submission record."""
        is_valid, err = validate_video_url(url)
        if not is_valid:
            raise InvalidVideoUrl(err)

        count = await ConsumerSubmission.find(
            ConsumerSubmission.user_id == user_id,
        ).count()
        if count >= max_submissions:
            raise SubmissionLimitReached(count, max_submissions)

        submission = ConsumerSubmission(
            url=url.strip(),
            user_id=user_id,
            email=email,
            priority=priority,
            source_tier=source_tier,
        )
        await submission.insert()
        logger.info(
            "Authenticated submission created",
            extra={"job_id": submission.job_id, "user_id": user_id, "url": url},
        )
        return submission

    async def get_user_submissions(
        self, user_id: str,
    ) -> List[ConsumerSubmission]:
        """List all submissions for an authenticated user, newest first."""
        return await ConsumerSubmission.find(
            ConsumerSubmission.user_id == user_id,
        ).sort("-created_at").to_list()

    async def get_user_submission_by_job_id(
        self, job_id: str, user_id: str,
    ) -> Optional[ConsumerSubmission]:
        """Look up a submission by job_id, scoped to a specific user."""
        return await ConsumerSubmission.find_one(
            ConsumerSubmission.job_id == job_id,
            ConsumerSubmission.user_id == user_id,
        )

    async def get_by_job_id(self, job_id: str) -> Optional[ConsumerSubmission]:
        """Look up a submission by its public job_id."""
        return await ConsumerSubmission.find_one(
            ConsumerSubmission.job_id == job_id,
        )

    async def run_extraction(self, submission: ConsumerSubmission) -> None:
        """Background task: title extraction -> TMDB -> characters."""
        await _run_extraction(submission)


consumer_submission_service = ConsumerSubmissionService()
