"""
Session-Based Credit Service

Manages dubbing sessions with periodic credit checkpointing (not per-second polling).
"""

from datetime import datetime
from typing import Optional
import uuid

from app.core.config import Settings
from app.core.logging_config import get_logger
from app.models.beta_session import BetaSession
from app.services.beta.credit_service import BetaCreditService
from app.core.metrics import record_session_metrics, record_checkpoint

logger = get_logger(__name__)


class SessionBasedCreditService:
    """
    Session-based credit tracking (not per-second ticks).
    
    Credit deduction happens at checkpoints (every 30 seconds)
    instead of per-second polling, reducing API load from
    1,000/sec to ~17/sec for 500 users.
    """

    def __init__(
        self,
        credit_service: BetaCreditService,
        settings: Settings
    ):
        """
        Dependency injection for SessionBasedCreditService.

        Args:
            credit_service: BetaCreditService instance
            settings: Application settings
        """
        self.credit_service = credit_service
        self.settings = settings

    async def start_dubbing_session(
        self,
        user_id: str,
        feature: str = "live_dubbing",
        metadata: dict = None
    ) -> Optional[str]:
        """
        Start dubbing session - create checkpoint, don't deduct yet.

        Args:
            user_id: User ID
            feature: Feature name (default: live_dubbing)
            metadata: Additional session metadata

        Returns:
            Session ID or None if failed
        """
        if metadata is None:
            metadata = {}

        try:
            # Generate unique session ID
            session_id = f"sess_{uuid.uuid4().hex[:16]}"

            # Create session checkpoint
            session = BetaSession(
                session_id=session_id,
                user_id=user_id,
                feature=feature,
                status="active",
                start_time=datetime.utcnow(),
                last_checkpoint=datetime.utcnow(),
                credits_consumed=0,
                metadata=metadata
            )
            await session.insert()

            logger.info(
                "Dubbing session started",
                extra={
                    "session_id": session_id,
                    "user_id": user_id,
                    "feature": feature
                }
            )

            # Record session start metric
            record_session_metrics(
                session_id=session_id,
                status="started"
            )

            return session_id

        except Exception as e:
            logger.error(
                "Failed to start session",
                extra={"user_id": user_id, "error": str(e)}
            )
            return None

    async def checkpoint_session(self, session_id: str) -> Optional[int]:
        """
        Periodic checkpoint (every 30 seconds) - deduct accumulated usage.
        Called by background worker, not per-second.

        Args:
            session_id: Session ID

        Returns:
            Remaining credits or None if failed
        """
        try:
            # Fetch active session
            session = await BetaSession.find_one(
                BetaSession.session_id == session_id,
                BetaSession.status == "active"
            )

            if not session:
                logger.warning(
                    "Session not found or not active",
                    extra={"session_id": session_id}
                )
                return None

            # Calculate seconds since last checkpoint
            elapsed = (datetime.utcnow() - session.last_checkpoint).total_seconds()

            # Deduct credits atomically
            success, remaining = await self.credit_service.deduct_credits(
                user_id=session.user_id,
                feature=session.feature,
                usage_amount=elapsed,  # Seconds of usage
                metadata={
                    "session_id": session_id,
                    "checkpoint": True,
                    "elapsed_seconds": elapsed
                }
            )

            if success:
                # Update checkpoint timestamp
                session.last_checkpoint = datetime.utcnow()
                session.credits_consumed += int(elapsed * await self.credit_service.get_credit_rate(session.feature))
                await session.save()

                logger.info(
                    "Session checkpoint completed",
                    extra={
                        "session_id": session_id,
                        "elapsed_seconds": elapsed,
                        "remaining_credits": remaining
                    }
                )

                # Record checkpoint metric
                record_checkpoint(
                    session_id=session_id,
                    lag_seconds=elapsed,
                    success=True
                )

                return remaining
            else:
                # Insufficient credits - end session
                logger.warning(
                    "Insufficient credits at checkpoint",
                    extra={"session_id": session_id}
                )
                await self.end_session(
                    session_id=session_id,
                    reason="insufficient_credits"
                )

                # Record checkpoint failure
                record_checkpoint(
                    session_id=session_id,
                    lag_seconds=elapsed,
                    success=False,
                    error_type="insufficient_credits"
                )

                return 0

        except Exception as e:
            logger.error(
                "Checkpoint error",
                extra={"session_id": session_id, "error": str(e)}
            )
            
            # Record checkpoint failure
            record_checkpoint(
                session_id=session_id,
                lag_seconds=0,
                success=False,
                error_type="database_error"
            )
            
            return None

    async def end_session(
        self,
        session_id: str,
        reason: str = "completed"
    ) -> Optional[int]:
        """
        End dubbing session - final deduction and cleanup.

        Args:
            session_id: Session ID
            reason: End reason (completed, insufficient_credits, timeout, user_stopped, error)

        Returns:
            Remaining credits or None if failed
        """
        try:
            # Fetch session
            session = await BetaSession.find_one(
                BetaSession.session_id == session_id
            )

            if not session:
                logger.warning(
                    "Session not found",
                    extra={"session_id": session_id}
                )
                return None

            # Calculate final elapsed time
            elapsed = (datetime.utcnow() - session.last_checkpoint).total_seconds()

            # Final deduction (if any time elapsed since last checkpoint)
            remaining = 0
            if elapsed > 0:
                success, remaining = await self.credit_service.deduct_credits(
                    user_id=session.user_id,
                    feature=session.feature,
                    usage_amount=elapsed,
                    metadata={
                        "session_id": session_id,
                        "final": True,
                        "reason": reason
                    }
                )

                if success:
                    session.credits_consumed += int(elapsed * await self.credit_service.get_credit_rate(session.feature))

            # Update session status
            session.status = "ended"
            session.end_time = datetime.utcnow()
            await session.save()

            # Calculate total duration
            duration_seconds = session.duration_seconds()

            logger.info(
                "Session ended",
                extra={
                    "session_id": session_id,
                    "duration_seconds": duration_seconds,
                    "reason": reason,
                    "credits_consumed": session.credits_consumed
                }
            )

            # Record session end metric
            record_session_metrics(
                session_id=session_id,
                status="ended",
                duration_seconds=duration_seconds,
                end_reason=reason
            )

            return remaining

        except Exception as e:
            logger.error(
                "End session error",
                extra={"session_id": session_id, "error": str(e)}
            )
            return None

    async def get_active_sessions(self, user_id: str) -> list[BetaSession]:
        """
        Get user's active sessions.

        Args:
            user_id: User ID

        Returns:
            List of active sessions
        """
        try:
            sessions = await BetaSession.find(
                BetaSession.user_id == user_id,
                BetaSession.status == "active"
            ).to_list()
            
            return sessions

        except Exception as e:
            logger.error(
                "Error fetching active sessions",
                extra={"user_id": user_id, "error": str(e)}
            )
            return []

    async def cleanup_timed_out_sessions(self) -> int:
        """
        Background worker: Clean up sessions that have timed out.
        
        Should be called periodically (every SESSION_CLEANUP_INTERVAL_SECONDS).

        Returns:
            Number of sessions cleaned up
        """
        try:
            # Find active sessions that haven't checkpointed recently
            timeout_threshold = datetime.utcnow()
            
            sessions = await BetaSession.find(
                BetaSession.status == "active"
            ).to_list()

            cleaned = 0
            for session in sessions:
                if session.is_timed_out(self.settings.SESSION_TIMEOUT_SECONDS):
                    await self.end_session(
                        session_id=session.session_id,
                        reason="timeout"
                    )
                    cleaned += 1

            if cleaned > 0:
                logger.info(
                    "Cleaned up timed out sessions",
                    extra={"count": cleaned}
                )

            return cleaned

        except Exception as e:
            logger.error(
                "Session cleanup error",
                extra={"error": str(e)}
            )
            return 0
