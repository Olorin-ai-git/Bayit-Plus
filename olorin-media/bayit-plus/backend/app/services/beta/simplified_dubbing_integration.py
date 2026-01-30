"""
Beta 500 Simplified Hebrew Dubbing Integration Service

Extends HebrewSimplificationService with Beta credit support.
Provides pre-authorization and real-time credit deduction during simplified dubbing sessions.
Mirrors BetaLiveDubbingIntegration architecture.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import AsyncIterator, Optional

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.beta.hebrew_simplification_service import HebrewSimplificationService
from app.services.beta.session_service import SessionBasedCreditService

logger = logging.getLogger(__name__)


class BetaSimplifiedDubbingIntegration:
    """
    Wraps HebrewSimplificationService with Beta 500 credit management.

    Responsibilities:
    - Pre-authorize Beta credits before starting simplified dubbing
    - Create credit session tracking
    - Periodic credit checkpoints (every 30 seconds)
    - Stop when credits depleted
    - Fallback to standard quota system for non-beta users
    """

    def __init__(
        self,
        channel: LiveChannel,
        user: User,
        vocabulary_level: str = "alef",
        voice_id: Optional[str] = None,
        platform: str = "web",
        credit_service: Optional[BetaCreditService] = None,
        session_service: Optional[SessionBasedCreditService] = None,
    ):
        self.channel = channel
        self.user = user
        self.vocabulary_level = vocabulary_level
        self.platform = platform

        # Use channel-specific voice or provided voice or config default
        self.voice_id = (
            voice_id
            or channel.simplified_hebrew_voice_id
            or settings.olorin.simplified_hebrew.voice_id
        )

        # Beta credit services (injected for testability)
        self._credit_service = credit_service or BetaCreditService(
            settings=settings,
            metering_service=None,
            db=None,
        )
        self._session_service = session_service or SessionBasedCreditService(
            credit_service=self._credit_service,
            settings=settings,
        )

        # Underlying simplification service (created on start)
        self._simplification_service: Optional[HebrewSimplificationService] = None
        self._session_id: Optional[str] = None
        self._credit_session_id: Optional[str] = None
        self._checkpoint_task: Optional[asyncio.Task] = None
        self._running = False

    @property
    def session_id(self) -> Optional[str]:
        """Get the session ID."""
        return self._session_id

    @property
    def is_running(self) -> bool:
        """Check if service is running."""
        return self._running

    async def start(self) -> dict:
        """
        Start simplified dubbing session with Beta credit pre-authorization.

        Returns:
            Session info including session_id, credit status, vocabulary_level
        """
        import uuid

        self._session_id = f"simplified_dub_{uuid.uuid4().hex[:12]}"

        try:
            # Check if user is Beta 500 enrolled
            is_beta = await self._credit_service.is_beta_user(str(self.user.id))

            # Create simplification service
            self._simplification_service = HebrewSimplificationService(
                vocabulary_level=self.vocabulary_level,
                voice_id=self.voice_id,
            )
            await self._simplification_service.start(self._session_id)
            self._running = True

            if is_beta:
                # Pre-authorize Beta credits
                balance = await self._credit_service.get_balance(str(self.user.id))
                rate = await self._credit_service.get_credit_rate("simplified_dubbing")

                if balance < rate:
                    raise ValueError(
                        f"Insufficient Beta credits: {balance} available, "
                        f"{rate} required per second"
                    )

                # Create credit session
                self._credit_session_id = (
                    f"beta_simp_dub_{self.user.id}_{datetime.now(timezone.utc).timestamp()}"
                )
                await self._session_service.start_dubbing_session(
                    user_id=str(self.user.id),
                    feature="simplified_dubbing",
                    metadata={
                        "session_id": self._session_id,
                        "vocabulary_level": self.vocabulary_level,
                    },
                )

                # Start periodic credit checkpoint
                self._checkpoint_task = asyncio.create_task(
                    self._periodic_credit_checkpoint()
                )

                estimated_seconds = int(balance / rate)

                logger.info(
                    "Beta simplified dubbing session started",
                    extra={
                        "session_id": self._session_id,
                        "credits": balance,
                        "estimated_runtime": estimated_seconds,
                    },
                )

                return {
                    "type": "connected",
                    "session_id": self._session_id,
                    "mode": "beta_credits",
                    "vocabulary_level": self.vocabulary_level,
                    "voice_id": self.voice_id,
                    "speaking_rate": settings.olorin.simplified_hebrew.speaking_rate,
                    "initial_balance": balance,
                    "credit_rate": rate,
                    "estimated_runtime_seconds": estimated_seconds,
                    "source_language": "he",
                }

            else:
                logger.info(
                    "Standard simplified dubbing session started",
                    extra={"session_id": self._session_id},
                )

                return {
                    "type": "connected",
                    "session_id": self._session_id,
                    "mode": "standard_quota",
                    "vocabulary_level": self.vocabulary_level,
                    "voice_id": self.voice_id,
                    "speaking_rate": settings.olorin.simplified_hebrew.speaking_rate,
                    "source_language": "he",
                }

        except ValueError:
            raise
        except Exception as e:
            logger.error(
                "Failed to start simplified dubbing session",
                extra={"error": str(e)},
            )
            if self._simplification_service:
                await self._simplification_service.stop()
            raise

    async def stop(self) -> dict:
        """Stop session and finalize credit deduction."""
        self._running = False

        if self._checkpoint_task:
            self._checkpoint_task.cancel()
            try:
                await self._checkpoint_task
            except asyncio.CancelledError:
                pass

        result = {}
        if self._simplification_service:
            result = await self._simplification_service.stop()

        if self._credit_session_id:
            remaining = await self._session_service.end_session(
                session_id=self._credit_session_id,
                reason="user_stopped",
            )
            result["mode"] = "beta_credits"
            result["credits_remaining"] = remaining
        else:
            result["mode"] = "standard_quota"

        return result

    async def process_transcript(self, transcript: str) -> AsyncIterator[dict]:
        """
        Process Hebrew transcript through simplification + TTS pipeline.

        Yields simplified text and audio chunks.
        """
        if self._simplification_service and self._running:
            async for chunk in self._simplification_service.process_transcript_to_audio(
                transcript
            ):
                yield chunk

    async def _periodic_credit_checkpoint(self) -> None:
        """Checkpoint credit usage every 30 seconds."""
        while self._running:
            try:
                await asyncio.sleep(30)
                if not self._running or not self._credit_session_id:
                    break

                remaining = await self._session_service.checkpoint_session(
                    session_id=self._credit_session_id
                )

                if remaining is None or remaining == 0:
                    logger.warning(
                        "Beta credits depleted for simplified dubbing",
                        extra={"session_id": self._session_id},
                    )
                    await self.stop()
                    break

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(
                    "Error in credit checkpoint",
                    extra={"error": str(e)},
                )
