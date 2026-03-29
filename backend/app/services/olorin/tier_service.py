"""
Olorin Tier Service - resolves user tier and answers feature-access questions.
"""

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.olorin_tier import OlorinTier, OlorinTierConfig, get_tier_config
from app.services.beta.credit_service import get_credits_for_olorin_tier

logger = get_logger(__name__)


class OlorinTierService:

    def resolve_tier(self, user) -> OlorinTier:
        raw = getattr(user, "olorin_tier", "free") or "free"
        try:
            return OlorinTier(raw)
        except ValueError:
            logger.warning(
                "Unknown olorin_tier value, defaulting to free",
                extra={"user_id": str(user.id), "raw_tier": raw},
            )
            return OlorinTier.FREE

    def _config(self, user) -> OlorinTierConfig:
        return get_tier_config(self.resolve_tier(user))

    def can_use_lip_sync(self, user) -> bool:
        return self._config(user).can_lip_sync

    def can_custom_urls(self, user) -> bool:
        return self._config(user).can_custom_urls

    def can_share_clips(self, user) -> bool:
        return self._config(user).can_share_clips

    def can_dubbing(self, user) -> bool:
        return self._config(user).can_dubbing

    def can_trivia(self, user) -> bool:
        return self._config(user).can_trivia

    def get_monthly_credits(self, user) -> int:
        tier = self.resolve_tier(user)
        return get_credits_for_olorin_tier(tier.value, settings)

    def get_max_characters(self, user) -> int:
        return self._config(user).max_characters_per_video

    def is_lifetime_credits(self, user) -> bool:
        return self._config(user).is_lifetime
