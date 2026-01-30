"""
Beta 500 Live Nikud Integration Service

Extends NikudLiveService with Beta credit support.
Provides pre-authorization and real-time credit deduction during live nikud sessions.
Mirrors BetaSmartSubsIntegration architecture.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.beta.nikud_live_service import NikudLiveService, NikudSubtitleCue
from app.services.beta.session_service import SessionBasedCreditService

logger = logging.getLogger(__name__)


class BetaNikudLiveIntegration:
    """
    Wraps NikudLiveService with Beta 500 credit management.

    Responsibilities:
    - Pre-authorize Beta credits before starting live nikud
    - Create credit session tracking
    - Periodic credit checkpoints (every 30 seconds)
    - Stop when credits depleted
    - Fallback to standard quota system for non-beta users
    """

    def __init__(
        self,
        channel: LiveChannel,
        user: User,
        platform: str = "web",
        credit_service: Optional[BetaCreditService] = None,
        session_service: Optional[SessionBasedCreditService] = None,
    ):
        self.channel = channel
        self.user = user
        self.platform = platform

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

        # Underlying nikud service (created on start)
        self._nikud_service: Optional[NikudLiveService] = None
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
        Start live nikud session with Beta credit pre-authorization.

        Returns:
            Session info dict with connection metadata.
        """
        import uuid

        self._session_id = f"live_nikud_{uuid.uuid4().hex[:12]}"

        try:
            is_beta = await self._credit_service.is_beta_user(str(self.user.id))

            # Create NikudLiveService
            self._nikud_service = NikudLiveService()
            await self._nikud_service.start(self._session_id)
            self._running = True

            if is_beta:
                balance = await self._credit_service.get_balance(str(self.user.id))
                rate = await self._credit_service.get_credit_rate("live_nikud")

                if balance < rate:
                    raise ValueError(
                        f"Insufficient Beta credits: {balance} available, "
                        f"{rate} required per second"
                    )

                self._credit_session_id = (
                    f"beta_nikud_{self.user.id}_{datetime.now(timezone.utc).timestamp()}"
                )
                await self._session_service.start_dubbing_session(
                    user_id=str(self.user.id),
                    feature="live_nikud",
                    metadata={
                        "session_id": self._session_id,
                        "channel_id": str(self.channel.id),
                    },
                )

                self._checkpoint_task = asyncio.create_task(
                    self._periodic_credit_checkpoint()
                )

                estimated_seconds = int(balance / rate)

                logger.info(
                    "Beta Live Nikud session started",
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
                    "display_duration_ms": settings.olorin.live_nikud.display_duration_ms,
                    "initial_balance": balance,
                    "credit_rate": rate,
                    "estimated_runtime_seconds": estimated_seconds,
                    "source_language": "he",
                }

            else:
                logger.info(
                    "Standard Live Nikud session started",
                    extra={"session_id": self._session_id},
                )

                return {
                    "type": "connected",
                    "session_id": self._session_id,
                    "mode": "standard_quota",
                    "display_duration_ms": settings.olorin.live_nikud.display_duration_ms,
                    "source_language": "he",
                }

        except ValueError:
            raise
        except Exception as e:
            logger.error(
                "Failed to start Live Nikud session",
                extra={"error": str(e)},
            )
            if self._nikud_service:
                await self._nikud_service.stop()
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
        if self._nikud_service:
            result = await self._nikud_service.stop()

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

    async def process_transcript(
        self, hebrew_transcript: str
    ) -> Optional[NikudSubtitleCue]:
        """
        Process Hebrew transcript through the nikud pipeline.

        Args:
            hebrew_transcript: Raw Hebrew text from STT.

        Returns:
            NikudSubtitleCue or None.
        """
        if self._nikud_service and self._running:
            return await self._nikud_service.add_nikud_realtime(hebrew_transcript)
        return None

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
                        "Beta credits depleted for Live Nikud",
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
