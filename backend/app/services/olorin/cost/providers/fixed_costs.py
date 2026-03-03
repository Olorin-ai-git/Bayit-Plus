"""Fixed costs provider: reads config registry and pro-rates."""

from datetime import date
from decimal import Decimal

from app.core.fixed_costs_config import FixedCostsConfig
from app.core.logging_config import get_logger

from .base import CostData, CostProvider

logger = get_logger(__name__)


class FixedCostsProvider(CostProvider):
    """Provides costs for services without billing APIs."""

    def __init__(self):
        """Load fixed costs from config."""
        self._config = FixedCostsConfig()

    async def get_costs(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Pro-rate fixed costs to the given period."""
        days = max((end_date - start_date).days, 1)
        total = Decimal("0")
        breakdown: dict[str, Decimal] = {}

        for entry in self._config.entries:
            daily = entry.monthly_cost / 30
            period_cost = daily * days
            total += period_cost
            breakdown[entry.service_name] = period_cost

        logger.info(
            "Fixed costs calculated",
            extra={
                "total": str(total),
                "entries": len(self._config.entries),
                "days": days,
            },
        )

        return CostData(
            service_name="fixed_costs",
            amount=total,
            start_date=start_date,
            end_date=end_date,
            breakdown=breakdown,
            metadata={"source": "config_registry"},
        )

    async def health_check(self) -> bool:
        """Config provider is always healthy."""
        return True
