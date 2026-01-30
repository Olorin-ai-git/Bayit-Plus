"""
Session-Based Credit Service

Manages Beta credit deduction for long-running sessions (dubbing, streaming).
Uses periodic checkpoints instead of per-second API calls for efficiency.
"""

import logging
from datetime import datetime
from typing import Optional, Tuple

from app.models.beta_session import BetaSession
from app.services.beta.credit_service import BetaCreditService

logger = logging.getLogger(__name__)


class SessionBasedCreditService:
    """
    Manages credit deduction for active sessions using periodic checkpoints.

    Pattern:
    1. start_dubbing_session() - Create session, no deduction
    2. checkpoint_session() - Periodic deduction (every 30s)
    3. end_session() - Final deduction for remaining time
    """

    def __init__(self, credit_service: BetaCreditService):
        """
        Initialize session service with credit service dependency.

        Args:
            credit_service: Beta credit service for deductions
        """
        self.credit_service = credit_service

    async def start_dubbing_session(
        self,
        user_id: str,
        session_id: str,
        feature: str = "live_dubbing",
    ) -> bool:
        """
        Start dubbing session - create checkpoint, don't deduct credits yet.

        Args:
            user_id: User identifier
            session_id: Unique session identifier
            feature: Feature name (default: live_dubbing)

        Returns:
            True if session created successfully
        """
        try:
            session = BetaSession(
                session_id=session_id,
                user_id=user_id,
                start_time=datetime.utcnow(),
                last_checkpoint=datetime.utcnow(),
                feature=feature,
                status="active",
            )
            await session.insert()

            logger.info(
                f"Dubbing session started: {session_id} for user {user_id}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to start dubbing session: {e}")
            return False

    async def checkpoint_session(self, session_id: str) -> Optional[int]:
        """
        Periodic checkpoint (every 30 seconds) - deduct accumulated usage.

        Called by background worker, not per-second.

        Args:
            session_id: Session identifier

        Returns:
            Remaining credits after deduction, or None if session ended
        """
        try:
            session = await BetaSession.find_one(
                BetaSession.session_id == session_id
            )

            if not session or session.status != "active":
                logger.warning(f"Session {session_id} not active for checkpoint")
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
                    "elapsed_seconds": elapsed,
                },
            )

            if success:
                # Update checkpoint time
                session.last_checkpoint = datetime.utcnow()
                await session.save()

                logger.debug(
                    f"Session checkpoint: {session_id}, "
                    f"deducted {elapsed}s, "
                    f"remaining {remaining}"
                )
                return remaining
            else:
                # Insufficient credits - end session
                logger.warning(
                    f"Insufficient credits for session {session_id}. Ending session."
                )
                await self.end_session(session_id, reason="insufficient_credits")
                return 0

        except Exception as e:
            logger.error(f"Error in session checkpoint: {e}")
            return None

    async def end_session(
        self,
        session_id: str,
        reason: str = "user_stopped",
    ) -> int:
        """
        End session - final deduction for remaining time.

        Args:
            session_id: Session identifier
            reason: Reason for ending (user_stopped, insufficient_credits, error)

        Returns:
            Remaining credits after final deduction
        """
        try:
            session = await BetaSession.find_one(
                BetaSession.session_id == session_id
            )

            if not session:
                logger.warning(f"Session {session_id} not found for end")
                return 0

            # Final deduction for time since last checkpoint
            elapsed = (datetime.utcnow() - session.last_checkpoint).total_seconds()

            if elapsed > 0:
                success, remaining = await self.credit_service.deduct_credits(
                    user_id=session.user_id,
                    feature=session.feature,
                    usage_amount=elapsed,
                    metadata={
                        "session_id": session_id,
                        "final": True,
                        "reason": reason,
                        "elapsed_seconds": elapsed,
                    },
                )
            else:
                # No time elapsed since last checkpoint
                remaining = await self.credit_service.get_balance(session.user_id)

            # Mark session as ended
            session.status = "ended"
            session.end_time = datetime.utcnow()
            session.end_reason = reason
            await session.save()

            logger.info(
                f"Session ended: {session_id}, "
                f"reason={reason}, "
                f"remaining={remaining}"
            )

            return remaining

        except Exception as e:
            logger.error(f"Error ending session: {e}")
            return 0

    async def get_active_sessions(self, user_id: str) -> list[BetaSession]:
        """
        Get all active sessions for a user.

        Args:
            user_id: User identifier

        Returns:
            List of active BetaSession objects
        """
        try:
            sessions = await BetaSession.find(
                BetaSession.user_id == user_id,
                BetaSession.status == "active",
            ).to_list()

            return sessions

        except Exception as e:
            logger.error(f"Error fetching active sessions: {e}")
            return []

    async def get_session_duration(self, session_id: str) -> Optional[float]:
        """
        Get current session duration in seconds.

        Args:
            session_id: Session identifier

        Returns:
            Duration in seconds, or None if session not found
        """
        try:
            session = await BetaSession.find_one(
                BetaSession.session_id == session_id
            )

            if not session:
                return None

            if session.status == "active":
                return (datetime.utcnow() - session.start_time).total_seconds()
            elif session.end_time:
                return (session.end_time - session.start_time).total_seconds()
            else:
                return None

        except Exception as e:
            logger.error(f"Error getting session duration: {e}")
            return None
