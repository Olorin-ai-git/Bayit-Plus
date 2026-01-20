"""
Upload Transaction Manager - Saga Pattern Implementation

Provides compensation-based transaction management for upload operations.
Ensures data consistency by rolling back partial changes on failure.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Coroutine, List, Optional

from app.models.upload import UploadJob

logger = logging.getLogger(__name__)


@dataclass
class CompensationAction:
    """Represents a compensation action that can undo a completed step."""

    action_name: str
    compensation: Callable[[], Coroutine[Any, Any, bool]]
    completed_at: datetime = field(default_factory=datetime.utcnow)
    compensation_result: Optional[bool] = None
    compensation_error: Optional[str] = None


@dataclass
class RollbackResult:
    """Result of a rollback operation."""

    success: bool
    actions_attempted: int
    actions_succeeded: int
    actions_failed: int
    errors: List[str] = field(default_factory=list)
    details: List[dict] = field(default_factory=list)


class UploadTransaction:
    """
    Manages upload operations as a saga with compensation-based rollback.

    Each step in the upload process registers a compensation action that
    can undo the step if a later step fails. This ensures data consistency
    even when failures occur partway through the upload process.

    Usage:
        transaction = UploadTransaction(job)

        # Execute step with automatic compensation registration
        gcs_url = await transaction.execute_with_compensation(
            action=lambda: gcs_uploader.upload_file(job),
            compensation=lambda: gcs_uploader.delete_file(job.gcs_path),
            action_name="gcs_upload"
        )

        # If any step fails, rollback will be called automatically
        # or can be called manually:
        await transaction.rollback()
    """

    def __init__(self, job: UploadJob):
        """
        Initialize the transaction manager.

        Args:
            job: The upload job this transaction is managing
        """
        self.job = job
        self._compensations: List[CompensationAction] = []
        self._committed = False
        self._rolled_back = False

    @property
    def is_active(self) -> bool:
        """Check if the transaction is still active (not committed or rolled back)."""
        return not self._committed and not self._rolled_back

    async def execute_with_compensation(
        self,
        action: Callable[[], Coroutine[Any, Any, Any]],
        compensation: Callable[[], Coroutine[Any, Any, bool]],
        action_name: str,
    ) -> Any:
        """
        Execute an action and register its compensation for potential rollback.

        Args:
            action: The async action to execute
            compensation: The async action to undo the main action if needed
            action_name: Human-readable name for logging

        Returns:
            The result of the action

        Raises:
            Exception: Re-raises any exception from the action after registering for rollback
        """
        if not self.is_active:
            raise RuntimeError("Transaction is no longer active")

        logger.debug(f"[Transaction {self.job.job_id}] Executing: {action_name}")

        try:
            result = await action()

            # Register compensation for successful action
            self._compensations.append(
                CompensationAction(
                    action_name=action_name,
                    compensation=compensation,
                    completed_at=datetime.utcnow(),
                )
            )

            logger.debug(
                f"[Transaction {self.job.job_id}] Completed: {action_name}, "
                f"registered compensation #{len(self._compensations)}"
            )

            return result

        except Exception as e:
            logger.error(
                f"[Transaction {self.job.job_id}] Failed: {action_name} - {e}",
                exc_info=True,
            )
            # Re-raise to allow caller to handle and trigger rollback
            raise

    def register_compensation(
        self, compensation: Callable[[], Coroutine[Any, Any, bool]], action_name: str
    ) -> None:
        """
        Manually register a compensation action without executing an action.

        Useful when the action is executed elsewhere but we still need
        to track its compensation for rollback purposes.

        Args:
            compensation: The async action to undo the step
            action_name: Human-readable name for logging
        """
        if not self.is_active:
            raise RuntimeError("Transaction is no longer active")

        self._compensations.append(
            CompensationAction(
                action_name=action_name,
                compensation=compensation,
                completed_at=datetime.utcnow(),
            )
        )

        logger.debug(
            f"[Transaction {self.job.job_id}] Registered compensation: {action_name}"
        )

    async def rollback(self) -> RollbackResult:
        """
        Execute all registered compensation actions in reverse order.

        This implements the saga pattern by undoing completed steps
        when a failure occurs, ensuring data consistency.

        Returns:
            RollbackResult with details of the rollback operation
        """
        if self._rolled_back:
            logger.warning(f"[Transaction {self.job.job_id}] Already rolled back")
            return RollbackResult(
                success=True,
                actions_attempted=0,
                actions_succeeded=0,
                actions_failed=0,
            )

        if self._committed:
            logger.warning(
                f"[Transaction {self.job.job_id}] Cannot rollback committed transaction"
            )
            return RollbackResult(
                success=False,
                actions_attempted=0,
                actions_succeeded=0,
                actions_failed=0,
                errors=["Transaction was already committed"],
            )

        self._rolled_back = True

        logger.info(
            f"[Transaction {self.job.job_id}] Starting rollback with "
            f"{len(self._compensations)} compensation actions"
        )

        result = RollbackResult(
            success=True,
            actions_attempted=len(self._compensations),
            actions_succeeded=0,
            actions_failed=0,
        )

        # Execute compensations in reverse order (LIFO)
        for comp in reversed(self._compensations):
            try:
                logger.info(
                    f"[Transaction {self.job.job_id}] Executing compensation: "
                    f"{comp.action_name}"
                )

                comp_result = await comp.compensation()
                comp.compensation_result = comp_result

                if comp_result:
                    result.actions_succeeded += 1
                    result.details.append(
                        {
                            "action": comp.action_name,
                            "status": "success",
                            "completed_at": comp.completed_at.isoformat(),
                        }
                    )
                    logger.info(
                        f"[Transaction {self.job.job_id}] Compensation succeeded: "
                        f"{comp.action_name}"
                    )
                else:
                    result.actions_failed += 1
                    result.success = False
                    error_msg = f"Compensation returned False: {comp.action_name}"
                    comp.compensation_error = error_msg
                    result.errors.append(error_msg)
                    result.details.append(
                        {
                            "action": comp.action_name,
                            "status": "failed",
                            "error": error_msg,
                        }
                    )
                    logger.error(
                        f"[Transaction {self.job.job_id}] Compensation failed: "
                        f"{comp.action_name}"
                    )

            except Exception as e:
                result.actions_failed += 1
                result.success = False
                error_msg = f"Compensation exception in {comp.action_name}: {str(e)}"
                comp.compensation_error = error_msg
                result.errors.append(error_msg)
                result.details.append(
                    {
                        "action": comp.action_name,
                        "status": "exception",
                        "error": str(e),
                    }
                )
                logger.error(
                    f"[Transaction {self.job.job_id}] Compensation exception: "
                    f"{comp.action_name} - {e}",
                    exc_info=True,
                )

        logger.info(
            f"[Transaction {self.job.job_id}] Rollback complete: "
            f"{result.actions_succeeded}/{result.actions_attempted} succeeded"
        )

        return result

    async def commit(self) -> None:
        """
        Mark the transaction as successfully completed.

        After commit, rollback is no longer possible and compensation
        actions are cleared.
        """
        if self._rolled_back:
            raise RuntimeError("Cannot commit a rolled-back transaction")

        if self._committed:
            logger.warning(f"[Transaction {self.job.job_id}] Already committed")
            return

        self._committed = True
        self._compensations.clear()

        logger.info(
            f"[Transaction {self.job.job_id}] Transaction committed successfully"
        )

    def get_compensation_count(self) -> int:
        """Get the number of registered compensation actions."""
        return len(self._compensations)

    def get_compensation_names(self) -> List[str]:
        """Get the names of all registered compensation actions."""
        return [c.action_name for c in self._compensations]
