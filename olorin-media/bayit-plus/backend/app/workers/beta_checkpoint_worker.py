"""
Background worker for Beta 500 session-based credit checkpoints.

This worker runs every 30 seconds and checkpoints all active dubbing/translation sessions,
deducting credits based on elapsed time since last checkpoint.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_database
from app.core.config import settings
from app.models.beta_session import BetaSession
from app.services.beta.session_service import SessionBasedCreditService
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService

logger = logging.getLogger(__name__)


class BetaCheckpointWorker:
    """
    Background worker for periodic credit checkpoints.

    Runs every 30 seconds and:
    1. Finds all active Beta 500 sessions
    2. Checkpoints each session (deducts credits based on elapsed time)
    3. Ends sessions that run out of credits
    4. Logs metrics and errors
    """

    def __init__(
        self,
        checkpoint_interval: int = None,
        max_batch_size: int = 100
    ):
        """
        Initialize checkpoint worker.

        Args:
            checkpoint_interval: Seconds between checkpoints (default: from settings)
            max_batch_size: Maximum sessions to process per batch
        """
        self.checkpoint_interval = checkpoint_interval or settings.SESSION_CHECKPOINT_INTERVAL_SECONDS
        self.max_batch_size = max_batch_size
        self.running = False
        self.task: Optional[asyncio.Task] = None

        # Initialize services
        self.db = None
        self.session_service = None
        self.credit_service = None

    async def initialize(self):
        """Initialize database and services."""
        try:
            self.db = get_database()

            # Initialize services
            metering_service = MeteringService()
            self.credit_service = BetaCreditService(
                settings=settings,
                metering_service=metering_service,
                db=self.db
            )
            self.session_service = SessionBasedCreditService(
                credit_service=self.credit_service,
                settings=settings
            )

            logger.info(
                "Beta checkpoint worker initialized",
                extra={
                    "checkpoint_interval_seconds": self.checkpoint_interval,
                    "max_batch_size": self.max_batch_size
                }
            )
        except Exception as e:
            logger.error(
                "Failed to initialize checkpoint worker",
                extra={"error": str(e), "error_type": type(e).__name__}
            )
            raise

    async def start(self):
        """Start background checkpoint loop."""
        if self.running:
            logger.warning("Checkpoint worker already running")
            return

        await self.initialize()

        self.running = True
        self.task = asyncio.create_task(self._checkpoint_loop())

        logger.info(
            "Beta checkpoint worker started",
            extra={"checkpoint_interval": f"{self.checkpoint_interval}s"}
        )

    async def stop(self):
        """Stop background checkpoint loop gracefully."""
        if not self.running:
            return

        logger.info("Stopping Beta checkpoint worker...")
        self.running = False

        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass

        logger.info("Beta checkpoint worker stopped")

    async def _checkpoint_loop(self):
        """Main checkpoint loop - runs every N seconds."""
        while self.running:
            try:
                await self._process_checkpoints()
            except Exception as e:
                logger.error(
                    "Checkpoint loop error (will retry)",
                    extra={
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "interval": f"{self.checkpoint_interval}s"
                    }
                )

            # Sleep until next checkpoint
            try:
                await asyncio.sleep(self.checkpoint_interval)
            except asyncio.CancelledError:
                logger.info("Checkpoint loop cancelled")
                break

    async def _process_checkpoints(self):
        """Process all active sessions and checkpoint them."""
        start_time = datetime.now(timezone.utc)

        # Find all active Beta 500 sessions
        active_sessions = await BetaSession.find(
            {"status": "active"}
        ).limit(self.max_batch_size).to_list()

        if not active_sessions:
            logger.debug("No active Beta sessions to checkpoint")
            return

        logger.info(
            "Processing checkpoints",
            extra={"active_sessions_count": len(active_sessions)}
        )

        # Checkpoint statistics
        checkpointed = 0
        ended = 0
        errors = 0

        for session in active_sessions:
            try:
                # Checkpoint the session
                remaining_credits = await self.session_service.checkpoint_session(
                    session_id=session.session_id
                )

                if remaining_credits is not None:
                    checkpointed += 1

                    # If credits exhausted, session was ended by checkpoint_session
                    if remaining_credits <= 0:
                        ended += 1
                        logger.warning(
                            "Session ended due to insufficient credits",
                            extra={
                                "session_id": session.session_id,
                                "user_id": session.user_id,
                                "feature": session.feature,
                                "elapsed_time_seconds": (
                                    datetime.now(timezone.utc) - session.start_time
                                ).total_seconds()
                            }
                        )

            except Exception as e:
                errors += 1
                logger.error(
                    "Failed to checkpoint session",
                    extra={
                        "session_id": session.session_id,
                        "user_id": session.user_id,
                        "feature": session.feature,
                        "error": str(e),
                        "error_type": type(e).__name__
                    }
                )

        # Log summary
        elapsed_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

        logger.info(
            "Checkpoint batch complete",
            extra={
                "total_sessions": len(active_sessions),
                "checkpointed": checkpointed,
                "ended": ended,
                "errors": errors,
                "elapsed_ms": round(elapsed_ms, 2)
            }
        )

        # Alert if processing took too long
        if elapsed_ms > (self.checkpoint_interval * 1000 * 0.8):
            logger.warning(
                "Checkpoint processing took >80% of interval - may fall behind",
                extra={
                    "elapsed_ms": round(elapsed_ms, 2),
                    "interval_ms": self.checkpoint_interval * 1000,
                    "total_sessions": len(active_sessions)
                }
            )


# Global worker instance
checkpoint_worker = BetaCheckpointWorker()


async def start_checkpoint_worker():
    """Start the global checkpoint worker."""
    await checkpoint_worker.start()


async def stop_checkpoint_worker():
    """Stop the global checkpoint worker."""
    await checkpoint_worker.stop()
