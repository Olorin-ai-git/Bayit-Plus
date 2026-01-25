"""Cloud Tasks client for enqueuing podcast translation jobs."""

import json
from datetime import datetime, timedelta
from typing import Optional

from google.cloud import tasks_v2
from google.protobuf import duration_pb2, timestamp_pb2

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class CloudTasksClient:
    """Client for enqueuing podcast translation jobs to Cloud Tasks."""

    def __init__(self):
        """Initialize Cloud Tasks client."""
        self.client = tasks_v2.CloudTasksClient()
        self.project = settings.GCP_PROJECT_ID
        self.location = settings.GCP_REGION
        self.queue = settings.CLOUD_TASKS_QUEUE_NAME

    async def enqueue_translation_job(
        self,
        episode_id: str,
        priority: str = "normal",
        schedule_time: Optional[datetime] = None,
    ) -> str:
        """
        Enqueue a podcast translation job.

        Args:
            episode_id: Episode ID to translate
            priority: "high" or "normal" priority level
            schedule_time: Optional future execution time

        Returns:
            Task name (full resource path)

        Raises:
            Exception: If task creation fails
        """
        parent = self.client.queue_path(self.project, self.location, self.queue)

        # Task payload
        payload = {
            "episode_id": episode_id,
            "enqueued_at": datetime.utcnow().isoformat(),
            "priority": priority,
        }

        # Cloud Run Jobs execution URL
        job_url = (
            f"https://{self.location}-run.googleapis.com/apis/run.googleapis.com/v1/"
            f"namespaces/{self.project}/jobs/podcast-translation-job:run"
        )

        # Create task configuration
        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": job_url,
                "headers": {
                    "Content-Type": "application/json",
                },
                "body": json.dumps(payload).encode(),
                "oidc_token": {
                    "service_account_email": settings.CLOUD_TASKS_SERVICE_ACCOUNT
                },
            }
        }

        # Schedule for future execution if specified
        if schedule_time:
            timestamp = timestamp_pb2.Timestamp()
            timestamp.FromDatetime(schedule_time)
            task["schedule_time"] = timestamp

        # Create the task
        try:
            response = self.client.create_task(request={"parent": parent, "task": task})

            logger.info(
                "Translation job enqueued",
                extra={
                    "episode_id": episode_id,
                    "task_name": response.name,
                    "priority": priority,
                    "schedule_time": (
                        schedule_time.isoformat() if schedule_time else None
                    ),
                },
            )

            return response.name

        except Exception as e:
            logger.error(
                "Failed to enqueue translation job",
                extra={"episode_id": episode_id, "error": str(e)},
            )
            raise

    async def cancel_task(self, task_name: str) -> None:
        """
        Cancel a scheduled task.

        Args:
            task_name: Full task resource name

        Raises:
            Exception: If task cancellation fails
        """
        try:
            self.client.delete_task(request={"name": task_name})

            logger.info("Translation job cancelled", extra={"task_name": task_name})

        except Exception as e:
            logger.error(
                "Failed to cancel translation job",
                extra={"task_name": task_name, "error": str(e)},
            )
            raise

    async def get_queue_stats(self) -> dict:
        """
        Get queue statistics.

        Returns:
            Dictionary with queue stats (size, rate, etc.)
        """
        try:
            queue_path = self.client.queue_path(self.project, self.location, self.queue)
            queue = self.client.get_queue(request={"name": queue_path})

            return {
                "name": queue.name,
                "state": queue.state.name,
                "rate_limits": {
                    "max_dispatches_per_second": queue.rate_limits.max_dispatches_per_second,
                    "max_concurrent_dispatches": queue.rate_limits.max_concurrent_dispatches,
                    "max_burst_size": queue.rate_limits.max_burst_size,
                },
                "retry_config": {
                    "max_attempts": queue.retry_config.max_attempts,
                    "max_retry_duration": queue.retry_config.max_retry_duration.seconds,
                },
            }

        except Exception as e:
            logger.error("Failed to get queue stats", extra={"error": str(e)})
            raise


# Singleton instance
_cloud_tasks_client: Optional[CloudTasksClient] = None


def get_cloud_tasks_client() -> CloudTasksClient:
    """Get or create CloudTasksClient singleton instance."""
    global _cloud_tasks_client
    if _cloud_tasks_client is None:
        _cloud_tasks_client = CloudTasksClient()
    return _cloud_tasks_client
