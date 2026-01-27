"""Configuration-based fallback cost provider."""

from datetime import date
from decimal import Decimal

from app.core.config import settings
from app.core.logging_config import get_logger

from .base import CostData, CostProvider

logger = get_logger(__name__)


class ConfigFallbackProvider(CostProvider):
    """
    Always returns cost data from configuration.

    Used as ultimate fallback when all APIs fail.
    """

    async def get_costs(self, start_date: date, end_date: date) -> CostData:
        """
        Return configured infrastructure costs.

        Divides monthly cost by days in period.
        """
        days_in_period = (end_date - start_date).days + 1
        total_infra_monthly = (
            settings.olorin.infrastructure.gcp_monthly
            + settings.olorin.infrastructure.mongodb_monthly
            + settings.olorin.infrastructure.firebase_monthly
            + settings.olorin.infrastructure.sentry_monthly
            + settings.olorin.infrastructure.cdn_monthly
        )
        daily_cost = total_infra_monthly / 30
        period_cost = daily_cost * days_in_period

        logger.info(
            "Using config fallback for infrastructure costs",
            extra={"period_cost": period_cost, "days": days_in_period},
        )

        return CostData(
            service_name="infrastructure_total",
            amount=Decimal(str(period_cost)),
            start_date=start_date,
            end_date=end_date,
        )

    async def health_check(self) -> bool:
        """Config provider is always healthy."""
        return True
