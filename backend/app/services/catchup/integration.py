"""Beta 500 credit integration for catch-up feature."""

from typing import Optional

from app.core.logging_config import get_logger
from app.services.beta.credit_service import BetaCreditService
from app.services.catchup.session_manager import (
    CatchUpSessionManager,
    get_session_manager,
)

logger = get_logger(__name__)


class CatchUpIntegration:
    """Beta 500 credit-wrapped catch-up integration.

    Handles credit verification, authorization, and deduction for catch-up summaries.
    """

    def __init__(
        self,
        user_id: str,
        channel_id: str,
        session_manager: Optional[CatchUpSessionManager] = None,
        credit_service: Optional[BetaCreditService] = None,
    ):
        """Initialize catch-up integration.

        Args:
            user_id: User identifier
            channel_id: Channel identifier
            session_manager: Optional session manager (uses singleton if None)
            credit_service: Optional credit service for Beta 500 enforcement
        """
        self.user_id = user_id
        self.channel_id = channel_id
        self._session_manager = session_manager or get_session_manager()
        self._credit_service = credit_service
        logger.info(
            "Catch-up integration initialized",
            extra={
                "user_id": user_id,
                "channel_id": channel_id,
                "has_credit_service": credit_service is not None,
            },
        )

    async def generate_catchup_with_credits(
        self, target_language: str, window_minutes: Optional[int] = None
    ) -> dict:
        """Generate catch-up summary with Beta 500 credit enforcement.

        Workflow:
        1. Verify beta user status
        2. Pre-authorize credits (1.0 credit)
        3. Generate summary via session manager
        4. Deduct credits atomically on success
        5. Return summary with credit info

        Args:
            target_language: Target language code
            window_minutes: Optional window duration (uses config default if None)

        Returns:
            Summary dict augmented with credits_used and remaining_credits

        Raises:
            ValueError: If user has insufficient credits or is not beta user
        """
        feature_name = "catchup_summary"
        credit_cost = 1.0

        # Verify beta user status
        if self._credit_service:
            is_beta = await self._credit_service.is_beta_user(self.user_id)
            if not is_beta:
                logger.warning(
                    "Non-beta user attempted catch-up access",
                    extra={"user_id": self.user_id, "channel_id": self.channel_id},
                )
                raise ValueError("Catch-up feature is only available to Beta 500 users")

            # Pre-authorize credits
            authorized, remaining = await self._credit_service.authorize(
                user_id=self.user_id,
                feature=feature_name,
                estimated_usage=credit_cost,
            )
            if not authorized:
                logger.warning(
                    "Insufficient credits for catch-up",
                    extra={
                        "user_id": self.user_id,
                        "channel_id": self.channel_id,
                        "balance": remaining,
                        "required": credit_cost,
                    },
                )
                raise ValueError(
                    f"Insufficient credits for catch-up. "
                    f"Available: {remaining}"
                )
            logger.debug(
                "Credits pre-authorized for catch-up",
                extra={
                    "user_id": self.user_id,
                    "channel_id": self.channel_id,
                    "cost": credit_cost,
                    "remaining": remaining,
                },
            )

        # Generate summary
        try:
            logger.info(
                "Generating catch-up summary with credit enforcement",
                extra={
                    "user_id": self.user_id,
                    "channel_id": self.channel_id,
                    "target_language": target_language,
                    "window_minutes": window_minutes,
                },
            )

            summary = await self._session_manager.generate_summary(
                channel_id=self.channel_id,
                user_id=self.user_id,
                target_language=target_language,
                window_minutes=window_minutes,
            )

            # Deduct credits atomically on success
            remaining_credits = None
            if self._credit_service:
                deduct_metadata = {
                    "channel_id": self.channel_id,
                    "target_language": target_language,
                    "window_minutes": window_minutes,
                    "cached": summary.get("cached", False),
                }

                success, remaining_credits = await self._credit_service.deduct_credits(
                    user_id=self.user_id,
                    feature=feature_name,
                    usage_amount=credit_cost,
                    metadata=deduct_metadata,
                )

                logger.info(
                    "Credits deducted for catch-up",
                    extra={
                        "user_id": self.user_id,
                        "channel_id": self.channel_id,
                        "cost": credit_cost,
                        "remaining_credits": remaining_credits,
                    },
                )

            # Augment summary with credit info
            result = {
                **summary,
                "credits_used": credit_cost,
                "remaining_credits": remaining_credits,
            }

            return result

        except Exception as e:
            # On failure, no credit deduction (authorize was pre-check only)
            logger.error(
                "Catch-up generation failed, no credits deducted",
                extra={
                    "user_id": self.user_id,
                    "channel_id": self.channel_id,
                    "error": str(e),
                },
            )
            raise

    async def check_available(self) -> dict:
        """Check if catch-up is available for user and channel.

        Returns:
            Availability dict with:
            - available (bool): Whether catch-up is technically available
            - is_beta_user (bool): Whether user is Beta 500 member
            - has_credits (bool): Whether user has sufficient credits
            - balance (int): Current credit balance
        """
        # Check technical availability (transcript data exists)
        available = await self._session_manager.check_catchup_available(self.channel_id)

        # Check beta user status and credits
        is_beta_user = False
        has_credits = False
        balance = 0

        if self._credit_service:
            is_beta_user = await self._credit_service.is_beta_user(self.user_id)
            if is_beta_user:
                raw_balance = await self._credit_service.get_balance(self.user_id)
                balance = raw_balance if raw_balance is not None else 0
                has_credits = balance >= 1

        logger.debug(
            "Checked catch-up availability",
            extra={
                "user_id": self.user_id,
                "channel_id": self.channel_id,
                "available": available,
                "is_beta_user": is_beta_user,
                "has_credits": has_credits,
                "balance": balance,
            },
        )

        return {
            "available": available,
            "is_beta_user": is_beta_user,
            "has_credits": has_credits,
            "balance": balance,
        }
