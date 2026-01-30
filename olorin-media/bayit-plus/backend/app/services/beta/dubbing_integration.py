"""
Beta 500 Dubbing Integration Service

Extends existing RealtimeDubbingService with Beta credit support.
Provides pre-authorization and real-time credit deduction during dubbing sessions.
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.services.beta.credit_service import BetaCreditService
from app.services.beta.session_credit_service import SessionBasedCreditService
from app.services.olorin.dubbing.service import RealtimeDubbingService
from app.services.olorin.dubbing.voice_settings import VoiceSettings

logger = logging.getLogger(__name__)


class BetaDubbingIntegration:
    """
    Wraps RealtimeDubbingService with Beta 500 credit management.

    Responsibilities:
    - Pre-authorize Beta credits before starting dubbing
    - Create credit session tracking
    - Periodic credit checkpoints during dubbing
    - Stop dubbing when credits depleted
    - Fallback to standard quota system for non-beta users
    """

    def __init__(
        self,
        user_id: str,
        partner: IntegrationPartner,
        source_language: str = "he",
        target_language: str = "en",
        voice_id: Optional[str] = None,
        voice_settings: Optional[VoiceSettings] = None,
        credit_service: Optional[BetaCreditService] = None,
        session_service: Optional[SessionBasedCreditService] = None,
    ):
        self.user_id = user_id
        self.partner = partner
        self.source_language = source_language
        self.target_language = target_language
        self.voice_id = voice_id
        self.voice_settings = voice_settings

        # Beta credit services (injected for testability)
        self._credit_service = credit_service or BetaCreditService(
            settings=settings,
            metering_service=None,  # Will use existing metering
            db=None  # Will use default connection
        )
        self._session_service = session_service or SessionBasedCreditService(
            credit_service=self._credit_service
        )

        # Underlying dubbing service (created on demand)
        self._dubbing_service: Optional[RealtimeDubbingService] = None
        self._dubbing_session_id: Optional[str] = None
        self._credit_session_id: Optional[str] = None

        # Checkpoint task
        self._checkpoint_task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self) -> dict:
        """
        Start dubbing session with Beta credit pre-authorization.

        Returns:
            Session info including session_id, credit status, estimated runtime

        Raises:
            ValueError: If Beta credits insufficient
            Exception: If dubbing service fails to start
        """
        try:
            # Step 1: Check if user is Beta 500 enrolled
            is_beta_user = await self._credit_service.is_beta_user(self.user_id)

            if is_beta_user:
                logger.info(
                    f"Starting Beta dubbing session for user {self.user_id}"
                )

                # Step 2: Pre-authorize credits
                balance = await self._credit_service.get_balance(self.user_id)
                rate = await self._credit_service.get_credit_rate("live_dubbing")

                if balance < rate:
                    raise ValueError(
                        f"Insufficient Beta credits: {balance} available, "
                        f"{rate} required per second"
                    )

                # Step 3: Create credit session
                self._credit_session_id = f"beta_dub_{self.user_id}_{datetime.utcnow().timestamp()}"
                await self._session_service.start_dubbing_session(
                    user_id=self.user_id,
                    session_id=self._credit_session_id
                )

                # Step 4: Start underlying dubbing service
                self._dubbing_service = RealtimeDubbingService(
                    partner=self.partner,
                    source_language=self.source_language,
                    target_language=self.target_language,
                    voice_id=self.voice_id,
                    voice_settings=self.voice_settings,
                )

                await self._dubbing_service.start()
                self._dubbing_session_id = self._dubbing_service.session_id
                self._running = True

                # Step 5: Start periodic credit checkpoint (every 30 seconds)
                self._checkpoint_task = asyncio.create_task(
                    self._periodic_credit_checkpoint()
                )

                # Calculate estimated runtime
                estimated_seconds = int(balance / rate)

                logger.info(
                    f"Beta dubbing session started: "
                    f"session={self._dubbing_session_id}, "
                    f"credits={balance}, "
                    f"estimated_runtime={estimated_seconds}s"
                )

                return {
                    "session_id": self._dubbing_session_id,
                    "credit_session_id": self._credit_session_id,
                    "mode": "beta_credits",
                    "initial_balance": balance,
                    "credit_rate": rate,
                    "estimated_runtime_seconds": estimated_seconds,
                }

            else:
                # Non-beta user: Use standard dubbing service (existing quota system)
                logger.info(
                    f"Starting standard dubbing session for user {self.user_id}"
                )

                self._dubbing_service = RealtimeDubbingService(
                    partner=self.partner,
                    source_language=self.source_language,
                    target_language=self.target_language,
                    voice_id=self.voice_id,
                    voice_settings=self.voice_settings,
                )

                await self._dubbing_service.start()
                self._dubbing_session_id = self._dubbing_service.session_id
                self._running = True

                return {
                    "session_id": self._dubbing_session_id,
                    "mode": "standard_quota",
                }

        except ValueError as e:
            logger.error(f"Beta credit authorization failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to start dubbing session: {e}")
            if self._dubbing_service:
                await self._dubbing_service.stop(error_message=str(e))
            raise

    async def stop(self, error_message: Optional[str] = None) -> dict:
        """
        Stop dubbing session and finalize credit deduction.

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
            dubbing_result = await self._dubbing_service.stop(error_message=error_message)

        # Finalize credit session if Beta user
        if self._credit_session_id:
            remaining = await self._session_service.end_session(
                session_id=self._credit_session_id,
                reason=error_message or "user_stopped"
            )

            logger.info(
                f"Beta dubbing session ended: "
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

    async def get_output_messages(self) -> 'AsyncIterator[DubbingMessage]':
        """
        Stream output messages from dubbing service.

        Yields:
            DubbingMessage: Dubbed audio, transcripts, latency reports, errors
        """
        if self._dubbing_service:
            async for message in self._dubbing_service.get_output_messages():
                yield message

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
                        "Stopping dubbing."
                    )
                    await self.stop(error_message="Beta credits depleted")
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


async def create_beta_dubbing_session(
    user_id: str,
    partner: IntegrationPartner,
    source_language: str = "he",
    target_language: str = "en",
    voice_id: Optional[str] = None,
    voice_settings: Optional[VoiceSettings] = None,
) -> BetaDubbingIntegration:
    """
    Factory function to create Beta-enabled dubbing session.

    Args:
        user_id: User identifier
        partner: Integration partner
        source_language: Source language code (default: he)
        target_language: Target language code (default: en)
        voice_id: ElevenLabs voice ID (optional)
        voice_settings: Custom voice settings (optional)

    Returns:
        BetaDubbingIntegration: Ready-to-start dubbing session
    """
    return BetaDubbingIntegration(
        user_id=user_id,
        partner=partner,
        source_language=source_language,
        target_language=target_language,
        voice_id=voice_id,
        voice_settings=voice_settings,
    )
