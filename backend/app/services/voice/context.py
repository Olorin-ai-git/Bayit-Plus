"""
Voice Context Module
Immutable context for voice request processing with lazy loading
"""

from dataclasses import dataclass
from typing import Optional

from app.core.logging_config import get_logger
from app.models.user import User
from app.models.family_controls import FamilyControls

logger = get_logger(__name__)


@dataclass(frozen=True)
class VoiceContext:
    """
    Immutable context for voice request processing.

    Provides user context and configuration needed for voice handlers.
    Uses lazy loading to avoid unnecessary database queries.
    """

    user_id: str
    language: str  # he, en, es
    platform: str  # web, ios, android, tvos
    conversation_id: str
    user: Optional[User] = None
    family_controls: Optional[FamilyControls] = None
    subscription_tier: Optional[str] = None

    @classmethod
    async def from_request(
        cls,
        user_id: str,
        language: str,
        platform: str,
        conversation_id: str,
        load_user: bool = True,
        load_family_controls: bool = False
    ) -> "VoiceContext":
        """
        Factory method to create context from request.

        Args:
            user_id: User identifier
            language: Language code (he, en, es)
            platform: Platform identifier (web, ios, android, tvos)
            conversation_id: Conversation identifier
            load_user: Whether to load user model from database
            load_family_controls: Whether to load family controls

        Returns:
            VoiceContext instance with loaded data
        """
        user = None
        family_controls = None
        subscription_tier = None

        # Lazy load user if requested
        if load_user:
            try:
                user = await User.get(user_id)
                if user:
                    subscription_tier = user.subscription_tier

                    logger.debug(
                        "User loaded",
                        extra={
                            "user_id": user_id,
                            "subscription_tier": subscription_tier,
                        }
                    )
            except Exception as e:
                logger.error(
                    "Failed to load user",
                    extra={"user_id": user_id, "error": str(e)},
                    exc_info=True
                )

        # Lazy load family controls if requested
        if load_family_controls and user:
            try:
                family_controls = await FamilyControls.find_one(
                    {"user_id": user_id}
)
                if family_controls:
                    logger.debug(
                        "Family controls loaded",
                        extra={
                            "user_id": user_id,
                            "kids_age_limit": family_controls.kids_age_limit
                        }
                    )
            except Exception as e:
                logger.error(
                    "Failed to load family controls",
                    extra={"user_id": user_id, "error": str(e)},
                    exc_info=True
                )

        return cls(
            user_id=user_id,
            language=language,
            platform=platform,
            conversation_id=conversation_id,
            user=user,
            family_controls=family_controls,
            subscription_tier=subscription_tier,
        )
