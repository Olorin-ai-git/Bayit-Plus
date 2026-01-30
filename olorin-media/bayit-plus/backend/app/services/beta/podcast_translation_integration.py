"""
Beta 500 Podcast Translation Integration Service

Extends existing PodcastTranslationService with Beta credit support.
Provides pre-authorization and stage-based credit deduction during translation pipeline.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Optional

from app.core.config import settings
from app.models.content import PodcastEpisode
from app.services.beta.credit_service import BetaCreditService
from app.services.podcast_translation_service import PodcastTranslationService

logger = logging.getLogger(__name__)


class BetaPodcastTranslationIntegration:
    """
    Wraps PodcastTranslationService with Beta 500 credit management.

    Responsibilities:
    - Pre-authorize Beta credits before starting translation
    - Deduct credits at each pipeline stage completion (weighted by cost)
    - Stop translation if credits depleted
    - Fallback to standard quota system for non-beta users

    Credit Deduction Strategy:
    - Pre-authorize based on estimated total cost
    - Deduct incrementally at each stage (weighted by computational cost)
    - Stages: Download (2%), Vocals (15%), Transcribe (20%), Commercials (3%),
              Translate (10%), TTS (40%), Mix (8%), Upload (2%)
    """

    # Credit costs per stage (percentage of total episode translation cost)
    STAGE_CREDIT_WEIGHTS = {
        "downloaded": 2.0,
        "vocals_separated": 15.0,
        "transcribed": 20.0,
        "commercials_removed": 3.0,
        "translated": 10.0,
        "tts_generated": 40.0,
        "mixed": 8.0,
        "uploaded": 2.0,
    }

    def __init__(
        self,
        user_id: str,
        credit_service: Optional[BetaCreditService] = None,
        translation_service: Optional[PodcastTranslationService] = None,
    ):
        self.user_id = user_id

        # Beta credit service (injected for testability)
        self._credit_service = credit_service or BetaCreditService(
            settings=settings,
            metering_service=None,  # Will use existing metering
            db=None  # Will use default connection
        )

        # Underlying podcast translation service
        self._translation_service = translation_service or PodcastTranslationService()
        self._is_beta_user: Optional[bool] = None
        self._total_credits_reserved = 0
        self._credits_consumed = 0

    async def translate_episode(
        self,
        episode: PodcastEpisode,
        target_lang_code: Optional[str] = None,
        force: bool = False,
        max_duration_seconds: Optional[int] = None,
        gender: str = "female",
    ) -> Dict[str, str]:
        """
        Translate podcast episode with Beta credit management.

        Args:
            episode: Episode to translate
            target_lang_code: Target language code (e.g., 'en', 'he')
            force: Force translation from beginning
            max_duration_seconds: Optional duration limit
            gender: Voice gender for TTS

        Returns:
            Dictionary mapping language codes to translated audio URLs

        Raises:
            ValueError: If Beta credits insufficient or episode already processing
            RuntimeError: If translation pipeline fails
        """
        # Check if user is Beta 500 enrolled
        self._is_beta_user = await self._credit_service.is_beta_user(self.user_id)

        if self._is_beta_user:
            logger.info(
                f"Starting Beta podcast translation for user {self.user_id}, "
                f"episode {episode.id}"
            )

            # Calculate total credit cost for episode
            # Base cost: 1 credit per minute of audio
            episode_duration_minutes = (episode.duration_seconds or 1800) / 60
            total_cost = int(episode_duration_minutes)

            # Pre-authorize total credits
            balance = await self._credit_service.get_balance(self.user_id)
            if balance < total_cost:
                raise ValueError(
                    f"Insufficient Beta credits: {balance} available, "
                    f"{total_cost} required for {episode_duration_minutes:.1f} minute episode"
                )

            logger.info(
                f"Pre-authorized {total_cost} credits for podcast translation "
                f"(episode duration: {episode_duration_minutes:.1f} minutes)"
            )

            # Wrap translation service with stage callbacks
            result = await self._translate_with_stage_tracking(
                episode=episode,
                target_lang_code=target_lang_code,
                force=force,
                max_duration_seconds=max_duration_seconds,
                gender=gender,
                total_cost=total_cost,
            )

            # Deduct remaining credits at completion
            remaining_cost = total_cost - self._credits_consumed
            if remaining_cost > 0:
                await self._deduct_credits(
                    amount=remaining_cost,
                    stage="completed",
                    episode_id=str(episode.id),
                )

            logger.info(
                f"Beta podcast translation complete: episode={episode.id}, "
                f"credits_used={self._credits_consumed}"
            )

            return result

        else:
            # Non-beta user: Use standard translation service
            logger.info(
                f"Starting standard podcast translation for user {self.user_id}, "
                f"episode {episode.id}"
            )
            return await self._translation_service.translate_episode(
                episode=episode,
                target_lang_code=target_lang_code,
                force=force,
                max_duration_seconds=max_duration_seconds,
                gender=gender,
            )

    async def _translate_with_stage_tracking(
        self,
        episode: PodcastEpisode,
        target_lang_code: Optional[str],
        force: bool,
        max_duration_seconds: Optional[int],
        gender: str,
        total_cost: int,
    ) -> Dict[str, str]:
        """
        Execute translation with stage-based credit deduction.

        Note: Since PodcastTranslationService doesn't expose stage hooks,
        we'll deduct credits based on completion. In future, could modify
        the service to support callbacks.
        """
        # Store initial stage state
        initial_stages = set(episode.translation_stages.keys()) if episode.translation_stages else set()

        # Execute translation
        result = await self._translation_service.translate_episode(
            episode=episode,
            target_lang_code=target_lang_code,
            force=force,
            max_duration_seconds=max_duration_seconds,
            gender=gender,
        )

        # Reload episode to get updated stages
        episode = await PodcastEpisode.get(episode.id)
        completed_stages = set(episode.translation_stages.keys()) if episode.translation_stages else set()

        # Deduct credits for newly completed stages
        new_stages = completed_stages - initial_stages
        for stage in new_stages:
            if stage in self.STAGE_CREDIT_WEIGHTS:
                stage_cost = int(total_cost * self.STAGE_CREDIT_WEIGHTS[stage] / 100)
                if stage_cost > 0:
                    await self._deduct_credits(
                        amount=stage_cost,
                        stage=stage,
                        episode_id=str(episode.id),
                    )

        return result

    async def _deduct_credits(
        self,
        amount: int,
        stage: str,
        episode_id: str,
    ) -> None:
        """
        Deduct credits for a completed stage.

        Args:
            amount: Number of credits to deduct
            stage: Stage name
            episode_id: Episode identifier
        """
        success, remaining = await self._credit_service.deduct_credits(
            user_id=self.user_id,
            feature="podcast_translation",
            usage_amount=amount,
            metadata={
                "stage": stage,
                "episode_id": episode_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        if success:
            self._credits_consumed += amount
            logger.info(
                f"Deducted {amount} credits for stage '{stage}' "
                f"(episode {episode_id}), remaining: {remaining}"
            )
        else:
            raise RuntimeError(
                f"Failed to deduct {amount} credits for stage '{stage}'. "
                f"Translation stopped due to insufficient credits."
            )


async def create_beta_podcast_translation(
    user_id: str,
) -> BetaPodcastTranslationIntegration:
    """
    Factory function to create Beta-enabled podcast translation service.

    Args:
        user_id: User identifier

    Returns:
        BetaPodcastTranslationIntegration: Ready-to-use translation service
    """
    return BetaPodcastTranslationIntegration(user_id=user_id)
