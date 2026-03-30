"""Domain config: Freemium credit allocations."""
from pydantic import Field


class FreemiumConfigMixin:
    """Monthly AI credit allocations per tier."""

    # Freemium credit allocations (monthly)
    FREE_MONTHLY_CREDITS: int = Field(
        default=10,
        env="FREE_MONTHLY_CREDITS",
        description="Monthly AI credits for free tier users"
    )
    PLUS_MONTHLY_CREDITS: int = Field(
        default=500,
        env="PLUS_MONTHLY_CREDITS",
        description="Monthly AI credits for Plus tier users"
    )
    FAN_MONTHLY_CREDITS: int = Field(
        default=100,
        env="FAN_MONTHLY_CREDITS",
        description="Monthly AI credits for Olorin Fan tier users"
    )
    SUPERFAN_MONTHLY_CREDITS: int = Field(
        default=300,
        env="SUPERFAN_MONTHLY_CREDITS",
        description="Monthly AI credits for Olorin Superfan tier users"
    )
    B2B_MONTHLY_CREDITS: int = Field(
        default=5000,
        env="B2B_MONTHLY_CREDITS",
        description="Monthly AI credits for Olorin B2B API tier partners"
    )
