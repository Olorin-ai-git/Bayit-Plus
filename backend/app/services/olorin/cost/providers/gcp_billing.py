"""GCP Cloud Billing API provider for cost data."""

import asyncio
import json
import logging
from datetime import date
from decimal import Decimal

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)


class GCPBillingProvider(CostProvider):
    """Fetches cost data from GCP Cloud Billing API."""

    def __init__(self):
        """Initialize GCP Billing provider."""
        self._credentials = None
        self._project_id = settings.olorin.infrastructure.gcp_monthly
        self._enabled = getattr(settings, "gcp_billing_api_enabled", False)

    @circuit_breaker("gcp_billing")
    async def get_costs(self, start_date: date, end_date: date) -> CostData:
        """
        Fetch GCP costs from Cloud Billing API.

        Falls back to config value on failure.
        """
        if not self._enabled:
            logger.info("GCP Billing API disabled, using config fallback")
            return self._get_fallback_cost()

        try:
            # Import Google client only if needed (avoid hard dependency)
            from google.cloud import billing_v1

            client = billing_v1.CloudBillingClient()

            # Query cost data from Cloud Billing API
            # Note: This is a simplified example
            costs = await self._query_billing_api(client, start_date, end_date)

            logger.info(
                "GCP costs fetched",
                extra={"start_date": start_date, "end_date": end_date, "costs": costs},
            )

            return CostData(
                service_name="gcp",
                amount=Decimal(str(costs)),
                start_date=start_date,
                end_date=end_date,
            )

        except Exception as e:
            logger.error(
                f"GCP Billing API error: {e}. Using fallback config values.",
                extra={"error": str(e)},
            )
            return self._get_fallback_cost()

    async def _query_billing_api(
        self, client, start_date: date, end_date: date
    ) -> float:
        """Query Cloud Billing API for costs."""
        # Placeholder for actual API query
        # Real implementation would use billing.projects().billingInfo().get()
        return 0.0

    def _get_fallback_cost(self) -> CostData:
        """Return fallback cost from configuration."""
        # Monthly cost divided by number of hours
        hourly_cost = settings.olorin.infrastructure.gcp_monthly / (24 * 30)
        return CostData(
            service_name="gcp",
            amount=Decimal(str(hourly_cost)),
        )

    async def health_check(self) -> bool:
        """Check if GCP credentials are valid."""
        if not self._enabled:
            return True

        try:
            # Placeholder - real impl would validate credentials
            return True
        except Exception:
            return False
