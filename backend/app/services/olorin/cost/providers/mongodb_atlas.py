"""MongoDB Atlas billing API provider for cost data."""

from datetime import date
from decimal import Decimal

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)

_ATLAS_BASE_URL = "https://cloud.mongodb.com/api/atlas/v2"


class MongoDBAtlasProvider(CostProvider):
    """Fetches real costs from MongoDB Atlas billing API."""

    def __init__(self):
        """Initialize with Atlas billing config."""
        cfg = settings.olorin.mongodb_billing
        self._enabled = cfg.enabled
        self._org_id = cfg.org_id
        self._public_key = cfg.public_key
        self._private_key = cfg.private_key

    @circuit_breaker("mongodb_atlas")
    async def get_costs(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Fetch Atlas costs via pending invoice API."""
        if not self._enabled or not self._org_id:
            logger.debug("MongoDB Atlas billing API disabled")
            return self._get_fallback_cost(start_date, end_date)

        try:
            total, by_cluster = await self._query_atlas_api()
            return CostData(
                service_name="mongodb_atlas",
                amount=total,
                start_date=start_date,
                end_date=end_date,
                breakdown=by_cluster,
                metadata={"source": "atlas_api", "org_id": self._org_id},
            )
        except Exception as exc:
            logger.error(
                "Atlas billing API failed, using fallback",
                extra={"error": str(exc)},
            )
            return self._get_fallback_cost(start_date, end_date)

    async def _query_atlas_api(
        self,
    ) -> tuple[Decimal, dict[str, Decimal]]:
        """Call Atlas v2 pending invoice endpoint with digest auth."""
        url = (
            f"{_ATLAS_BASE_URL}/orgs/{self._org_id}/invoices/pending"
        )
        auth = httpx.DigestAuth(self._public_key, self._private_key)

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                auth=auth,
                headers={"Accept": "application/vnd.atlas.2023-01-01+json"},
                timeout=30.0,
            )
            resp.raise_for_status()
            data = resp.json()

        total = Decimal("0")
        by_cluster: dict[str, Decimal] = {}

        for item in data.get("lineItems", []):
            amount = Decimal(str(item.get("totalPriceCents", 0))) / 100
            total += amount
            cluster = item.get("clusterName", "shared")
            key = f"cluster:{cluster}"
            by_cluster[key] = by_cluster.get(key, Decimal("0")) + amount

        logger.info(
            "Atlas billing fetched",
            extra={
                "total": str(total),
                "clusters": len(by_cluster),
            },
        )
        return total, by_cluster

    def _get_fallback_cost(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Return config-based estimate."""
        days = (end_date - start_date).days or 1
        daily = settings.olorin.infrastructure.mongodb_monthly / 30
        return CostData(
            service_name="mongodb_atlas",
            amount=Decimal(str(daily * days)),
            start_date=start_date,
            end_date=end_date,
            metadata={"source": "config_fallback"},
        )

    async def health_check(self) -> bool:
        """Verify Atlas API connectivity."""
        if not self._enabled or not self._org_id:
            return True
        try:
            url = f"{_ATLAS_BASE_URL}/orgs/{self._org_id}"
            auth = httpx.DigestAuth(
                self._public_key, self._private_key
            )
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    url, auth=auth, timeout=10.0
                )
                return resp.status_code == 200
        except Exception:
            return False
