"""Fixed cost registry for services without billing APIs."""

from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from pydantic import ConfigDict


class BillingCycle(str, Enum):
    """Billing cycle for fixed cost entries."""

    MONTHLY = "monthly"
    YEARLY = "yearly"


class CostCategory(str, Enum):
    """Category of a cost entry."""

    AI = "ai"
    INFRASTRUCTURE = "infrastructure"
    THIRD_PARTY = "third_party"
    DEVELOPMENT = "development"
    DOMAIN = "domain"


class Platform(str, Enum):
    """Olorin platform that incurs the cost."""

    SHARED = "shared"
    BAYIT_PLUS = "bayit_plus"
    OLORIN_FRAUD = "olorin_fraud"
    CVPLUS = "cvplus"
    STATION_AI = "station_ai"


class FixedCostEntry(BaseModel):
    """A single fixed-cost service entry."""

    service_name: str
    monthly_cost: Decimal
    billing_cycle: BillingCycle
    category: CostCategory
    platform: Platform


class FixedCostsConfig(BaseSettings):
    """Registry of services with known fixed costs."""

    entries: list[FixedCostEntry] = Field(
        default_factory=lambda: [
            FixedCostEntry(
                service_name="Claude Code",
                monthly_cost=Decimal("200"),
                billing_cycle=BillingCycle.MONTHLY,
                category=CostCategory.AI,
                platform=Platform.SHARED,
            ),
            FixedCostEntry(
                service_name="Apple Developer Program",
                monthly_cost=Decimal("99") / 12,
                billing_cycle=BillingCycle.YEARLY,
                category=CostCategory.DEVELOPMENT,
                platform=Platform.SHARED,
            ),
            FixedCostEntry(
                service_name="bayit.tv domain",
                monthly_cost=Decimal("20") / 12,
                billing_cycle=BillingCycle.YEARLY,
                category=CostCategory.DOMAIN,
                platform=Platform.BAYIT_PLUS,
            ),
            FixedCostEntry(
                service_name="olorin.ai domain",
                monthly_cost=Decimal("40") / 12,
                billing_cycle=BillingCycle.YEARLY,
                category=CostCategory.DOMAIN,
                platform=Platform.SHARED,
            ),
            FixedCostEntry(
                service_name="cvplus.ai domain",
                monthly_cost=Decimal("20") / 12,
                billing_cycle=BillingCycle.YEARLY,
                category=CostCategory.DOMAIN,
                platform=Platform.CVPLUS,
            ),
            FixedCostEntry(
                service_name="Vercel/Turborepo",
                monthly_cost=Decimal("20"),
                billing_cycle=BillingCycle.MONTHLY,
                category=CostCategory.INFRASTRUCTURE,
                platform=Platform.SHARED,
            ),
            FixedCostEntry(
                service_name="Picovoice",
                monthly_cost=Decimal("15"),
                billing_cycle=BillingCycle.MONTHLY,
                category=CostCategory.AI,
                platform=Platform.BAYIT_PLUS,
            ),
            FixedCostEntry(
                service_name="Fal.ai",
                monthly_cost=Decimal("10"),
                billing_cycle=BillingCycle.MONTHLY,
                category=CostCategory.AI,
                platform=Platform.SHARED,
            ),
            FixedCostEntry(
                service_name="Exa AI",
                monthly_cost=Decimal("25"),
                billing_cycle=BillingCycle.MONTHLY,
                category=CostCategory.AI,
                platform=Platform.SHARED,
            ),
            FixedCostEntry(
                service_name="Google Play Developer",
                monthly_cost=Decimal("25") / 12,
                billing_cycle=BillingCycle.YEARLY,
                category=CostCategory.DEVELOPMENT,
                platform=Platform.SHARED,
            ),
            FixedCostEntry(
                service_name="OpenSubtitles",
                monthly_cost=Decimal("10"),
                billing_cycle=BillingCycle.MONTHLY,
                category=CostCategory.THIRD_PARTY,
                platform=Platform.BAYIT_PLUS,
            ),
            FixedCostEntry(
                service_name="TMDB API",
                monthly_cost=Decimal("0"),
                billing_cycle=BillingCycle.MONTHLY,
                category=CostCategory.THIRD_PARTY,
                platform=Platform.BAYIT_PLUS,
            ),
        ],
        description="List of fixed-cost service entries",
    )

    model_config = ConfigDict(env_prefix="FIXED_COSTS_")
