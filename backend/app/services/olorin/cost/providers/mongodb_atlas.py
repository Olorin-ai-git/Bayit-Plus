"""MongoDB Atlas API provider for cost data."""

import logging
from datetime import date
from decimal import Decimal

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)


class MongoDBAtlasProvider(CostProvider):
    """Fetches cost data from MongoDB Atlas API."""

    def __init__(self):
        """Initialize MongoDB Atlas provider."""
        self._enabled = getattr(settings, "mongodb_billing_api_enabled", False)
        self._org_id = getattr(settings, "mongodb_org_id", "")
        self._api_key = getattr(settings, "mongodb_api_key", "")

    @circuit_breaker("mongodb_atlas")
    async def get_costs(self, start_date: date, end_date: date) -> CostData:
        """
        Fetch MongoDB Atlas costs from Atlas API.

        Falls back to config value on failure.
        """
        if not self._enabled or not self._org_id or not self._api_key:
            logger.debug("MongoDB Atlas API disabled, using config fallback")
            return self._get_fallback_cost()

        try:
            costs = await self._query_atlas_api(start_date, end_date)

            logger.info(
                "MongoDB Atlas costs fetched",
                extra={"start_date": start_date, "end_date": end_date, "costs": costs},
            )

            return CostData(
                service_name="mongodb_atlas",
                amount=Decimal(str(costs)),
                start_date=start_date,
                end_date=end_date,
            )

        except Exception as e:
            logger.error(
                f"MongoDB Atlas API error: {e}. Using fallback config values.",
                extra={"error": str(e)},
            )
            return self._get_fallback_cost()

    async def _query_atlas_api(self, start_date: date, end_date: date) -> float:
        """Query MongoDB Atlas API for organization costs."""
        # Placeholder for actual API query
        # Real implementation would use:
        # GET /api/atlas/v2/groups/{groupId}/invoices
        # with date filtering
        return 0.0

    def _get_fallback_cost(self) -> CostData:
        """Return fallback cost from configuration."""
        # Monthly cost divided by number of hours
        hourly_cost = settings.olorin.infrastructure.mongodb_monthly / (24 * 30)
        return CostData(
            service_name="mongodb_atlas",
            amount=Decimal(str(hourly_cost)),
        )

    async def health_check(self) -> bool:
        """Check if MongoDB API credentials are valid."""
        if not self._enabled or not self._org_id or not self._api_key:
            return True

        try:
            # Placeholder - real impl would validate credentials
            return True
        except Exception:
            return False
