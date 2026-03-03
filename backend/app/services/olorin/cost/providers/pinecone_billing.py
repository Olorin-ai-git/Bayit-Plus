"""Pinecone serverless usage billing provider."""

from datetime import date
from decimal import Decimal

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)


class PineconeBillingProvider(CostProvider):
    """Fetches Pinecone serverless usage and costs."""

    def __init__(self):
        """Initialize with Pinecone config."""
        cfg = settings.olorin.pinecone_billing
        self._enabled = cfg.enabled
        self._api_key = settings.olorin.pinecone.api_key

    @circuit_breaker("pinecone_billing")
    async def get_costs(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Fetch Pinecone usage data."""
        if not self._enabled or not self._api_key:
            logger.debug("Pinecone billing disabled")
            return CostData(
                service_name="pinecone",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "disabled"},
            )

        try:
            total, breakdown = await self._query_usage()
            return CostData(
                service_name="pinecone",
                amount=total,
                start_date=start_date,
                end_date=end_date,
                breakdown=breakdown,
                metadata={"source": "pinecone_api"},
            )
        except Exception as exc:
            logger.error(
                "Pinecone usage query failed",
                extra={"error": str(exc)},
            )
            return CostData(
                service_name="pinecone",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "error"},
            )

    async def _query_usage(
        self,
    ) -> tuple[Decimal, dict[str, Decimal]]:
        """Query Pinecone collections for index stats."""
        url = "https://api.pinecone.io/indexes"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                headers={"Api-Key": self._api_key},
                timeout=15.0,
            )
            resp.raise_for_status()
            data = resp.json()

        total = Decimal("0")
        breakdown: dict[str, Decimal] = {}

        for index in data.get("indexes", []):
            name = index.get("name", "unknown")
            status = index.get("status", {})
            if status.get("state") == "Ready":
                spec = index.get("spec", {})
                serverless = spec.get("serverless", {})
                if serverless:
                    cost = Decimal("0.0001") * Decimal(
                        str(index.get("dimension", 1536))
                    )
                    total += cost
                    breakdown[f"index:{name}"] = cost

        return total, breakdown

    async def health_check(self) -> bool:
        """Check Pinecone API connectivity."""
        if not self._enabled or not self._api_key:
            return True
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.pinecone.io/indexes",
                    headers={"Api-Key": self._api_key},
                    timeout=10.0,
                )
                return resp.status_code == 200
        except Exception:
            return False
