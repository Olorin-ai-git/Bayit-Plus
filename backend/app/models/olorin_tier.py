"""
Olorin.ai pricing tier definitions.

Maps the 4 advertised tiers (Free/Fan/Superfan/B2B) to their
feature entitlements and credit allocations.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Union


class OlorinTier(str, Enum):
    FREE = "free"
    FAN = "fan"
    SUPERFAN = "superfan"
    B2B = "b2b"

    @property
    def rank(self) -> int:
        return _TIER_RANKS[self]


_TIER_RANKS = {
    OlorinTier.FREE: 0,
    OlorinTier.FAN: 1,
    OlorinTier.SUPERFAN: 2,
    OlorinTier.B2B: 3,
}


@dataclass(frozen=True)
class OlorinTierConfig:
    monthly_credits: int
    is_lifetime: bool
    can_lip_sync: bool
    can_custom_urls: bool
    can_share_clips: bool
    can_dubbing: bool
    can_trivia: bool
    max_characters_per_video: int


OLORIN_TIER_CONFIGS: dict[str, OlorinTierConfig] = {
    OlorinTier.FREE.value: OlorinTierConfig(
        monthly_credits=10, is_lifetime=True,
        can_lip_sync=False, can_custom_urls=False, can_share_clips=False,
        can_dubbing=False, can_trivia=False, max_characters_per_video=3,
    ),
    OlorinTier.FAN.value: OlorinTierConfig(
        monthly_credits=100, is_lifetime=False,
        can_lip_sync=False, can_custom_urls=True, can_share_clips=True,
        can_dubbing=False, can_trivia=False, max_characters_per_video=5,
    ),
    OlorinTier.SUPERFAN.value: OlorinTierConfig(
        monthly_credits=300, is_lifetime=False,
        can_lip_sync=True, can_custom_urls=True, can_share_clips=True,
        can_dubbing=True, can_trivia=True, max_characters_per_video=5,
    ),
    OlorinTier.B2B.value: OlorinTierConfig(
        monthly_credits=5000, is_lifetime=False,
        can_lip_sync=True, can_custom_urls=True, can_share_clips=True,
        can_dubbing=True, can_trivia=True, max_characters_per_video=10,
    ),
}


def get_tier_config(tier: Union[OlorinTier, str]) -> OlorinTierConfig:
    key = tier.value if isinstance(tier, OlorinTier) else tier
    return OLORIN_TIER_CONFIGS[key]
