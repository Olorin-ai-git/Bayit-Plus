"""
Beta 500 Live Dubbing Integration Service

Extends existing LiveDubbingService with Beta credit support for live channels.
Provides pre-authorization and real-time credit deduction during live dubbing sessions.
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
from app.services.live_dubbing_service import LiveDubbingService

logger = logging.getLogger(__name__)


class BetaLiveDubbingIntegration:
    """
    Wraps LiveDubbingService with Beta 500 credit management.

    Responsibilities:
    - Pre-authorize Beta credits before starting live dubbing
    - Create credit session tracking
    - Periodic credit checkpoints during dubbing
    - Stop dubbing when credits depleted
    - Fallback to standard quota system for non-beta users
    """

    def __init__(
        self,
        channel: LiveChannel,
        user: User,
        target_language: str,
        voice_id: Optional[str] = None,
        platform: str = "web",
        credit_service: Optional[BetaCreditService] = None,
        session_service: Optional[SessionBasedCreditService] = None,
    ):
        self.channel = channel
        self.user = user
        self.target_language = target_language
        self.voice_id = voice_id
        self.platform = platform

        # Beta credit services (injected for testability)
        self._credit_service = credit_service or BetaCreditService(
            settings=settings,
            metering_service=None,  # Will use existing metering
            db=None  # Will use default connection
        )
        self._session_service = session_service or SessionBasedCreditService(
            credit_service=self._credit_service
        )

        # Underlying live dubbing service (created on demand)
        self._dubbing_service: Optional[LiveDubbingService] = None
        self._dubbing_session_id: Optional[str] = None
        self._credit_session_id: Optional[str] = None

        # Checkpoint task
        self._checkpoint_task: Optional[asyncio.Task] = None
        self._running = False

    @property
    def session_id(self) -> Optional[str]:
        """Get the dubbing session ID."""
        return self._dubbing_session_id

    @property
    def is_running(self) -> bool:
        """Check if dubbing is running."""
        return self._running and self._dubbing_service is not None

    async def start(self) -> dict:
        """
        Start live dubbing session with Beta credit pre-authorization.

        Returns:
            Session info including session_id, credit status, estimated runtime

        Raises:
            ValueError: If Beta credits insufficient
            Exception: If dubbing service fails to start
        """
        try:
            # Step 1: Check if user is Beta 500 enrolled
            is_beta_user = await self._credit_service.is_beta_user(str(self.user.id))

            if is_beta_user:
                logger.info(
                    f"Starting Beta live dubbing session for user {self.user.id}"
                )

                # Step 2: Pre-authorize credits
                balance = await self._credit_service.get_balance(str(self.user.id))
                rate = await self._credit_service.get_credit_rate("live_dubbing")

                if balance < rate:
                    raise ValueError(
                        f"Insufficient Beta credits: {balance} available, "
                        f"{rate} required per second"
                    )

                # Step 3: Create credit session
                self._credit_session_id = f"beta_live_dub_{self.user.id}_{datetime.now(timezone.utc).timestamp()}"
                await self._session_service.start_dubbing_session(
                    user_id=str(self.user.id),
                    session_id=self._credit_session_id,
                    feature="live_dubbing"
                )

                # Step 4: Start underlying live dubbing service
                self._dubbing_service = LiveDubbingService(
                    channel=self.channel,
                    user=self.user,
                    target_language=self.target_language,
                    voice_id=self.voice_id,
                    platform=self.platform,
                )

                connection_info = await self._dubbing_service.start()
                self._dubbing_session_id = self._dubbing_service.session_id
                self._running = True

                # Step 5: Start periodic credit checkpoint (every 30 seconds)
                self._checkpoint_task = asyncio.create_task(
                    self._periodic_credit_checkpoint()
                )

                # Calculate estimated runtime
                estimated_seconds = int(balance / rate)

                logger.info(
                    f"Beta live dubbing session started: "
                    f"session={self._dubbing_session_id}, "
                    f"credits={balance}, "
                    f"estimated_runtime={estimated_seconds}s"
                )

                return {
                    **connection_info,
                    "credit_session_id": self._credit_session_id,
                    "mode": "beta_credits",
                    "initial_balance": balance,
                    "credit_rate": rate,
                    "estimated_runtime_seconds": estimated_seconds,
                }

            else:
                # Non-beta user: Use standard live dubbing service (existing quota system)
                logger.info(
                    f"Starting standard live dubbing session for user {self.user.id}"
                )

                self._dubbing_service = LiveDubbingService(
                    channel=self.channel,
                    user=self.user,
                    target_language=self.target_language,
                    voice_id=self.voice_id,
                    platform=self.platform,
                )

                connection_info = await self._dubbing_service.start()
                self._dubbing_session_id = self._dubbing_service.session_id
                self._running = True

                return {
                    **connection_info,
                    "mode": "standard_quota",
                }

        except ValueError as e:
            logger.error(f"Beta credit authorization failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to start live dubbing session: {e}")
            if self._dubbing_service:
                await self._dubbing_service.stop()
            raise

    async def stop(self) -> dict:
        """
        Stop live dubbing session and finalize credit deduction.

        Returns:
            Session summary with final credit usage
        """
        self._running = False

        # Cancel checkpoint task
        if self._checkpoint_task:
            self._checkpoint_task.cancel()
            try:
                await self._checkpoint_task
            except asyncio.CancelledError:
                pass

        # Stop underlying dubbing service
        dubbing_result = {}
        if self._dubbing_service:
            dubbing_result = await self._dubbing_service.stop()

        # Finalize credit session if Beta user
        if self._credit_session_id:
            remaining = await self._session_service.end_session(
                session_id=self._credit_session_id,
                reason="user_stopped"
            )

            logger.info(
                f"Beta live dubbing session ended: "
                f"session={self._dubbing_session_id}, "
                f"credits_remaining={remaining}"
            )

            return {
                **dubbing_result,
                "mode": "beta_credits",
                "credits_remaining": remaining,
                "credit_session_id": self._credit_session_id,
            }

        return {
            **dubbing_result,
            "mode": "standard_quota",
        }

    async def process_audio_chunk(self, audio_data: bytes) -> None:
        """
        Forward audio chunk to underlying dubbing service.

        Args:
            audio_data: Raw PCM audio bytes (16kHz, mono, 16-bit signed)
        """
        if self._dubbing_service and self._running:
            await self._dubbing_service.process_audio_chunk(audio_data)

    async def receive_messages(self):
        """
        Stream output messages from dubbing service.

        Yields:
            DubbingMessage: Dubbed audio, transcripts, latency reports, errors
        """
        if self._dubbing_service:
            async for message in self._dubbing_service.receive_messages():
                yield message

    async def run_pipeline(self) -> None:
        """
        Run the dubbing pipeline.

        Delegates to underlying LiveDubbingService.
        """
        if self._dubbing_service:
            await self._dubbing_service.run_pipeline()

    def get_latency_report(self) -> dict:
        """
        Get current latency report.

        Returns:
            Latency metrics from underlying service
        """
        if self._dubbing_service:
            return self._dubbing_service.get_latency_report()
        return {}

    async def _periodic_credit_checkpoint(self) -> None:
        """
        Periodically checkpoint credit usage (every 30 seconds).
        Stops dubbing if credits depleted.
        """
        while self._running:
            try:
                await asyncio.sleep(30)  # Checkpoint interval

                if not self._running or not self._credit_session_id:
                    break

                # Perform checkpoint
                remaining = await self._session_service.checkpoint_session(
                    session_id=self._credit_session_id
                )

                if remaining is None or remaining == 0:
                    # Credits depleted - stop dubbing
                    logger.warning(
                        f"Beta credits depleted for session {self._dubbing_session_id}. "
                        "Stopping live dubbing."
                    )
                    await self.stop()
                    break

                logger.debug(
                    f"Beta credit checkpoint: session={self._dubbing_session_id}, "
                    f"remaining={remaining}"
                )

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in credit checkpoint: {e}")
                # Continue checkpointing despite errors


async def create_beta_live_dubbing_session(
    channel: LiveChannel,
    user: User,
    target_language: str,
    voice_id: Optional[str] = None,
    platform: str = "web",
) -> BetaLiveDubbingIntegration:
    """
    Factory function to create Beta-enabled live dubbing session.

    Args:
        channel: Live channel to dub
        user: User requesting dubbing
        target_language: Target language code (default: en)
        voice_id: ElevenLabs voice ID (optional)
        platform: Client platform (web, ios, tvos, android)

    Returns:
        BetaLiveDubbingIntegration: Ready-to-start live dubbing session
    """
    return BetaLiveDubbingIntegration(
        channel=channel,
        user=user,
        target_language=target_language,
        voice_id=voice_id,
        platform=platform,
    )
