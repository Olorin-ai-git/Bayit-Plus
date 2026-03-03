"""Redis Cloud billing API provider."""

from datetime import date
from decimal import Decimal

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)

_REDIS_CLOUD_URL = "https://api.redislabs.com/v1"


class RedisCloudBillingProvider(CostProvider):
    """Fetches Redis Cloud subscription cost data."""

    def __init__(self):
        """Initialize with Redis Cloud config."""
        cfg = settings.olorin.redis_cloud_billing
        self._enabled = cfg.enabled
        self._api_key = cfg.api_key
        self._api_secret = cfg.api_secret
        self._subscription_id = cfg.subscription_id

    @circuit_breaker("redis_cloud_billing")
    async def get_costs(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Fetch Redis Cloud subscription cost."""
        if not self._enabled or not self._api_key:
            logger.debug("Redis Cloud billing disabled")
            return CostData(
                service_name="redis_cloud",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "disabled"},
            )

        try:
            total, breakdown = await self._query_cost()
            days = max((end_date - start_date).days, 1)
            prorated = total * days / 30
            return CostData(
                service_name="redis_cloud",
                amount=prorated,
                start_date=start_date,
                end_date=end_date,
                breakdown=breakdown,
                metadata={"source": "redis_cloud_api"},
            )
        except Exception as exc:
            logger.error(
                "Redis Cloud cost query failed",
                extra={"error": str(exc)},
            )
            return CostData(
                service_name="redis_cloud",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "error"},
            )

    async def _query_cost(
        self,
    ) -> tuple[Decimal, dict[str, Decimal]]:
        """Call Redis Cloud subscription cost endpoint."""
        url = f"{_REDIS_CLOUD_URL}/subscriptions/{self._subscription_id}"
        headers = {
            "x-api-key": self._api_key,
            "x-api-secret-key": self._api_secret,
        }

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url, headers=headers, timeout=15.0
            )
            resp.raise_for_status()
            data = resp.json()

        monthly_cost = Decimal(
            str(data.get("price", [{}])[0].get("amountInCents", 0))
        ) / 100

        breakdown: dict[str, Decimal] = {
            "subscription": monthly_cost,
        }

        return monthly_cost, breakdown

    async def health_check(self) -> bool:
        """Verify Redis Cloud API connectivity."""
        if not self._enabled or not self._api_key:
            return True
        try:
            headers = {
                "x-api-key": self._api_key,
                "x-api-secret-key": self._api_secret,
            }
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{_REDIS_CLOUD_URL}/subscriptions",
                    headers=headers,
                    timeout=10.0,
                )
                return resp.status_code == 200
        except Exception:
            return False
