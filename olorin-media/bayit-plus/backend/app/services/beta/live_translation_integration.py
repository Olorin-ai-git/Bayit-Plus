"""
Beta 500 Live Translation Integration Service

Extends existing LiveTranslationService with Beta credit support for live subtitles.
Provides pre-authorization and real-time credit deduction during translation sessions.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, AsyncIterator, Dict, Optional

from app.core.config import settings
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.beta.session_credit_service import SessionBasedCreditService
from app.services.live_translation_service import LiveTranslationService

logger = logging.getLogger(__name__)


class BetaLiveTranslationIntegration:
    """
    Wraps LiveTranslationService with Beta 500 credit management.

    Responsibilities:
    - Pre-authorize Beta credits before starting live translation
    - Create credit session tracking
    - Periodic credit checkpoints during translation
    - Stop translation when credits depleted
    - Fallback to standard quota system for non-beta users
    """

    def __init__(
        self,
        user: User,
        source_lang: str = "he",
        target_lang: str = "en",
        credit_service: Optional[BetaCreditService] = None,
        session_service: Optional[SessionBasedCreditService] = None,
        translation_service: Optional[LiveTranslationService] = None,
    ):
        self.user = user
        self.source_lang = source_lang
        self.target_lang = target_lang

        # Beta credit services (injected for testability)
        self._credit_service = credit_service or BetaCreditService(
            settings=settings,
            metering_service=None,  # Will use existing metering
            db=None  # Will use default connection
        )
        self._session_service = session_service or SessionBasedCreditService(
            credit_service=self._credit_service
        )

        # Underlying translation service
        self._translation_service = translation_service or LiveTranslationService()
        self._credit_session_id: Optional[str] = None
        self._is_beta_user: Optional[bool] = None
        self._running = False

    async def start_session(self) -> Dict[str, Any]:
        """
        Pre-authorize Beta credits and create session.

        Returns:
            Session info including mode (beta_credits or standard_quota)

        Raises:
            ValueError: If Beta credits insufficient
        """
        # Check if user is Beta 500 enrolled
        self._is_beta_user = await self._credit_service.is_beta_user(str(self.user.id))

        if self._is_beta_user:
            logger.info(
                f"Starting Beta live translation session for user {self.user.id}"
            )

            # Pre-authorize credits
            balance = await self._credit_service.get_balance(str(self.user.id))
            rate = await self._credit_service.get_credit_rate("live_translation")

            if balance < rate:
                raise ValueError(
                    f"Insufficient Beta credits: {balance} available, "
                    f"{rate} required per second"
                )

            # Create credit session
            self._credit_session_id = f"beta_live_trans_{self.user.id}_{datetime.utcnow().timestamp()}"
            await self._session_service.start_dubbing_session(
                user_id=str(self.user.id),
                session_id=self._credit_session_id,
                feature="live_translation"
            )

            self._running = True

            # Calculate estimated runtime
            estimated_seconds = int(balance / rate)

            logger.info(
                f"Beta live translation session started: "
                f"session={self._credit_session_id}, "
                f"credits={balance}, "
                f"estimated_runtime={estimated_seconds}s"
            )

            return {
                "mode": "beta_credits",
                "credit_session_id": self._credit_session_id,
                "initial_balance": balance,
                "credit_rate": rate,
                "estimated_runtime_seconds": estimated_seconds,
                "source_lang": self.source_lang,
                "target_lang": self.target_lang,
            }
        else:
            # Non-beta user: Use standard quota system
            logger.info(
                f"Starting standard live translation session for user {self.user.id}"
            )
            self._running = True

            return {
                "mode": "standard_quota",
                "source_lang": self.source_lang,
                "target_lang": self.target_lang,
            }

    async def stop_session(self) -> Dict[str, Any]:
        """
        End session and finalize credit deduction.

        Returns:
            Session summary with final credit usage
        """
        self._running = False

        # Finalize credit session if Beta user
        if self._credit_session_id:
            remaining = await self._session_service.end_session(
                session_id=self._credit_session_id,
                reason="user_stopped"
            )

            logger.info(
                f"Beta live translation session ended: "
                f"session={self._credit_session_id}, "
                f"credits_remaining={remaining}"
            )

            return {
                "mode": "beta_credits",
                "credits_remaining": remaining,
                "credit_session_id": self._credit_session_id,
            }

        return {
            "mode": "standard_quota",
        }

    async def process_audio_with_credits(
        self,
        audio_stream: AsyncIterator[bytes],
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Process audio stream with Beta credit checkpointing.

        Wraps the audio stream to checkpoint credits every 30 seconds.
        Stops processing when credits depleted.

        Args:
            audio_stream: Async iterator of audio chunks

        Yields:
            Subtitle cues from translation service
        """
        if not self._is_beta_user:
            # Non-beta user: Pass through to standard service
            async for subtitle_cue in self._translation_service.process_live_audio_to_subtitles(
                audio_stream,
                source_lang=self.source_lang,
                target_lang=self.target_lang,
            ):
                yield subtitle_cue
            return

        # Beta user: Wrap with credit checkpointing
        checkpoint_task = asyncio.create_task(self._periodic_credit_checkpoint())

        try:
            async for subtitle_cue in self._translation_service.process_live_audio_to_subtitles(
                audio_stream,
                source_lang=self.source_lang,
                target_lang=self.target_lang,
            ):
                if not self._running:
                    # Credits depleted - stop processing
                    logger.warning(
                        f"Beta credits depleted for session {self._credit_session_id}. "
                        "Stopping translation."
                    )
                    break
                yield subtitle_cue

        finally:
            # Cancel checkpoint task
            checkpoint_task.cancel()
            try:
                await checkpoint_task
            except asyncio.CancelledError:
                pass

    async def _periodic_credit_checkpoint(self) -> None:
        """
        Periodically checkpoint credit usage (every 30 seconds).
        Stops translation if credits depleted.
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
                    # Credits depleted - stop translation
                    logger.warning(
                        f"Beta credits depleted for session {self._credit_session_id}. "
                        "Stopping translation."
                    )
                    self._running = False
                    break

                logger.debug(
                    f"Beta credit checkpoint: session={self._credit_session_id}, "
                    f"remaining={remaining}"
                )

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in credit checkpoint: {e}")
                # Continue checkpointing despite errors


async def create_beta_live_translation_session(
    user: User,
    source_lang: str = "he",
    target_lang: str = "en",
) -> BetaLiveTranslationIntegration:
    """
    Factory function to create Beta-enabled live translation session.

    Args:
        user: User requesting translation
        source_lang: Source language code (default: he)
        target_lang: Target language code (default: en)

    Returns:
        BetaLiveTranslationIntegration: Ready-to-start translation session
    """
    return BetaLiveTranslationIntegration(
        user=user,
        source_lang=source_lang,
        target_lang=target_lang,
    )
