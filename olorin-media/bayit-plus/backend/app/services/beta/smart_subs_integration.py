"""
Beta 500 Smart Subs Integration Service

Extends SmartSubtitleService with Beta credit support.
Provides pre-authorization and real-time credit deduction during Smart Subs sessions.
Mirrors BetaLiveTranslationIntegration architecture.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.beta.session_service import SessionBasedCreditService
from app.services.beta.smart_subtitle_service import SmartSubtitleCue, SmartSubtitleService

logger = logging.getLogger(__name__)


class BetaSmartSubsIntegration:
    """
    Wraps SmartSubtitleService with Beta 500 credit management.

    Responsibilities:
    - Pre-authorize Beta credits before starting Smart Subs
    - Create credit session tracking
    - Periodic credit checkpoints (every 30 seconds)
    - Stop when credits depleted
    - Fallback to standard quota system for non-beta users
    """

    def __init__(
        self,
        channel: LiveChannel,
        user: User,
        target_language: str = "en",
        show_shoresh: bool = True,
        platform: str = "web",
        vocabulary_level: str = "alef",
        credit_service: Optional[BetaCreditService] = None,
        session_service: Optional[SessionBasedCreditService] = None,
    ):
        self.channel = channel
        self.user = user
        self.target_language = target_language
        self.show_shoresh = show_shoresh
        self.platform = platform
        self.vocabulary_level = vocabulary_level

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

        # Underlying Smart Subtitle service (created on start)
        self._smart_subs_service: Optional[SmartSubtitleService] = None
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
        Start Smart Subs session with Beta credit pre-authorization.

        Returns:
            Session info dict
        """
        import uuid

        self._session_id = f"smart_subs_{uuid.uuid4().hex[:12]}"

        try:
            is_beta = await self._credit_service.is_beta_user(str(self.user.id))

            # Create Smart Subtitle service
            self._smart_subs_service = SmartSubtitleService(
                target_language=self.target_language,
                show_shoresh=self.show_shoresh,
                vocabulary_level=self.vocabulary_level,
            )
            await self._smart_subs_service.start(self._session_id)
            self._running = True

            if is_beta:
                balance = await self._credit_service.get_balance(str(self.user.id))
                rate = await self._credit_service.get_credit_rate("smart_subs")

                if balance < rate:
                    raise ValueError(
                        f"Insufficient Beta credits: {balance} available, "
                        f"{rate} required per second"
                    )

                self._credit_session_id = (
                    f"beta_smart_subs_{self.user.id}_{datetime.now(timezone.utc).timestamp()}"
                )
                await self._session_service.start_dubbing_session(
                    user_id=str(self.user.id),
                    feature="smart_subs",
                    metadata={
                        "session_id": self._session_id,
                        "target_language": self.target_language,
                        "show_shoresh": self.show_shoresh,
                    },
                )

                self._checkpoint_task = asyncio.create_task(
                    self._periodic_credit_checkpoint()
                )

                estimated_seconds = int(balance / rate)

                logger.info(
                    "Beta Smart Subs session started",
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
                    "target_language": self.target_language,
                    "show_shoresh": self.show_shoresh,
                    "shoresh_highlight_color": settings.olorin.smart_subs.shoresh_highlight_color,
                    "display_duration_ms": settings.olorin.smart_subs.dual_subtitle_display_duration_ms,
                    "initial_balance": balance,
                    "credit_rate": rate,
                    "estimated_runtime_seconds": estimated_seconds,
                    "source_language": "he",
                }

            else:
                logger.info(
                    "Standard Smart Subs session started",
                    extra={"session_id": self._session_id},
                )

                return {
                    "type": "connected",
                    "session_id": self._session_id,
                    "mode": "standard_quota",
                    "target_language": self.target_language,
                    "show_shoresh": self.show_shoresh,
                    "shoresh_highlight_color": settings.olorin.smart_subs.shoresh_highlight_color,
                    "display_duration_ms": settings.olorin.smart_subs.dual_subtitle_display_duration_ms,
                    "source_language": "he",
                }

        except ValueError:
            raise
        except Exception as e:
            logger.error(
                "Failed to start Smart Subs session",
                extra={"error": str(e)},
            )
            if self._smart_subs_service:
                await self._smart_subs_service.stop()
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
        if self._smart_subs_service:
            result = await self._smart_subs_service.stop()

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
    ) -> Optional[SmartSubtitleCue]:
        """
        Process Hebrew transcript through the Smart Subs pipeline.

        Returns:
            SmartSubtitleCue or None
        """
        if self._smart_subs_service and self._running:
            return await self._smart_subs_service.process_transcript(hebrew_transcript)
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
                        "Beta credits depleted for Smart Subs",
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
