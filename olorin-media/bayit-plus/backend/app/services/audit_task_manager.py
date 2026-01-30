"""
Audit Task Manager
Manages running audit tasks, allowing pause, resume, cancellation, and message injection.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class AuditTaskManager:
    """Singleton manager for tracking and controlling running audit tasks."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._running_tasks: Dict[str, asyncio.Task] = {}
        self._task_states: Dict[str, str] = (
            {}
        )  # audit_id -> state (running, paused, cancelled)
        self._pause_events: Dict[str, asyncio.Event] = (
            {}
        )  # audit_id -> event to wait when paused
        self._pending_messages: Dict[str, List[Dict[str, Any]]] = (
            {}
        )  # audit_id -> list of messages
        self._initialized = True
        logger.info("AuditTaskManager initialized")

    def register_task(self, audit_id: str, task: asyncio.Task) -> None:
        """Register a running audit task."""
        self._running_tasks[audit_id] = task
        self._task_states[audit_id] = "running"
        self._pause_events[audit_id] = asyncio.Event()
        self._pause_events[audit_id].set()  # Initially not paused
        logger.info(f"Registered audit task: {audit_id}")

    def unregister_task(self, audit_id: str) -> None:
        """Unregister a completed audit task."""
        if audit_id in self._running_tasks:
            del self._running_tasks[audit_id]
        if audit_id in self._task_states:
            del self._task_states[audit_id]
        if audit_id in self._pause_events:
            del self._pause_events[audit_id]
        if audit_id in self._pending_messages:
            del self._pending_messages[audit_id]
        logger.info(f"Unregistered audit task: {audit_id}")

    def get_task_state(self, audit_id: str) -> Optional[str]:
        """Get the current state of an audit task."""
        return self._task_states.get(audit_id)

    def is_running(self, audit_id: str) -> bool:
        """Check if an audit is currently running."""
        return (
            audit_id in self._running_tasks and not self._running_tasks[audit_id].done()
        )

    async def pause_task(self, audit_id: str) -> bool:
        """
        Pause a running audit task.
        The task must check should_continue() periodically.
        """
        if audit_id not in self._running_tasks:
            logger.warning(f"Cannot pause: audit {audit_id} not found")
            return False

        if audit_id not in self._pause_events:
            logger.warning(f"Cannot pause: no pause event for audit {audit_id}")
            return False

        self._task_states[audit_id] = "paused"
        self._pause_events[audit_id].clear()  # Block the task
        logger.info(f"Paused audit task: {audit_id}")
        return True

    async def resume_task(self, audit_id: str) -> bool:
        """Resume a paused audit task."""
        if audit_id not in self._running_tasks:
            logger.warning(f"Cannot resume: audit {audit_id} not found")
            return False

        if audit_id not in self._pause_events:
            logger.warning(f"Cannot resume: no pause event for audit {audit_id}")
            return False

        self._task_states[audit_id] = "running"
        self._pause_events[audit_id].set()  # Unblock the task
        logger.info(f"Resumed audit task: {audit_id}")
        return True

    async def cancel_task(self, audit_id: str) -> bool:
        """
        Cancel a running or paused audit task.
        This will cause the task to raise CancelledError.
        """
        if audit_id not in self._running_tasks:
            logger.warning(f"Cannot cancel: audit {audit_id} not found")
            return False

        task = self._running_tasks[audit_id]
        self._task_states[audit_id] = "cancelled"

        # If paused, resume first so the task can handle cancellation
        if audit_id in self._pause_events and not self._pause_events[audit_id].is_set():
            self._pause_events[audit_id].set()

        # Cancel the task
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            logger.info(f"Cancelled audit task: {audit_id}")
        except Exception as e:
            logger.error(f"Error while cancelling audit {audit_id}: {e}")

        return True

    async def check_should_continue(self, audit_id: str) -> bool:
        """
        Check if the audit should continue running.
        This should be called periodically by the audit execution code.

        Returns:
            True if should continue, False if cancelled

        Raises:
            asyncio.CancelledError if the task was cancelled
        """
        # Check if cancelled
        if audit_id in self._task_states and self._task_states[audit_id] == "cancelled":
            logger.info(f"Audit {audit_id} detected cancellation")
            raise asyncio.CancelledError(f"Audit {audit_id} was cancelled")

        # Check if paused - wait for resume
        if audit_id in self._pause_events:
            event = self._pause_events[audit_id]
            if not event.is_set():
                logger.info(f"Audit {audit_id} is paused, waiting for resume...")
                await event.wait()
                logger.info(f"Audit {audit_id} resumed")

                # Check again if cancelled while paused
                if (
                    audit_id in self._task_states
                    and self._task_states[audit_id] == "cancelled"
                ):
                    logger.info(f"Audit {audit_id} detected cancellation after pause")
                    raise asyncio.CancelledError(f"Audit {audit_id} was cancelled")

        return True

    def get_running_audits(self) -> Set[str]:
        """Get set of all currently running audit IDs."""
        return {
            audit_id
            for audit_id, task in self._running_tasks.items()
            if not task.done()
        }

    def cleanup_completed_tasks(self) -> None:
        """Remove completed tasks from tracking."""
        completed = [
            audit_id for audit_id, task in self._running_tasks.items() if task.done()
        ]
        for audit_id in completed:
            self.unregister_task(audit_id)

    def queue_message(self, audit_id: str, message: str, source: str = "admin") -> bool:
        """
        Queue a message for injection into the audit conversation.

        Args:
            audit_id: The audit ID to queue the message for
            message: The message content to inject
            source: The source of the message (e.g., "admin")

        Returns:
            True if message was queued successfully, False if audit not found
        """
        if audit_id not in self._running_tasks:
            logger.warning(f"Cannot queue message: audit {audit_id} not found")
            return False

        if audit_id not in self._pending_messages:
            self._pending_messages[audit_id] = []

        self._pending_messages[audit_id].append(
            {"content": message, "source": source, "timestamp": datetime.now(timezone.utc)}
        )
        logger.info(f"Queued message for audit {audit_id}: {message[:100]}...")
        return True

    def get_pending_messages(self, audit_id: str) -> List[Dict[str, Any]]:
        """
        Get and clear pending messages for an audit.

        Args:
            audit_id: The audit ID to get messages for

        Returns:
            List of pending messages (cleared after retrieval)
        """
        if audit_id not in self._pending_messages:
            return []

        messages = self._pending_messages[audit_id]
        self._pending_messages[audit_id] = []
        return messages

    def has_pending_messages(self, audit_id: str) -> bool:
        """
        Check if there are pending messages for an audit.

        Args:
            audit_id: The audit ID to check

        Returns:
            True if there are pending messages, False otherwise
        """
        return bool(self._pending_messages.get(audit_id))


# Global singleton instance
audit_task_manager = AuditTaskManager()
