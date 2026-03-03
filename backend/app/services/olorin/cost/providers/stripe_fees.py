"""Stripe processing fees provider via balance transactions."""

from datetime import date, datetime, time
from decimal import Decimal

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)


class StripeFeeProvider(CostProvider):
    """Calculates actual Stripe processing fees from transactions."""

    def __init__(self):
        """Initialize with Stripe config."""
        self._api_key = getattr(settings, "STRIPE_SECRET_KEY", "")

    @circuit_breaker("stripe_fees")
    async def get_costs(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Fetch Stripe balance transactions and sum fees."""
        if not self._api_key:
            logger.debug("Stripe API key not configured")
            return CostData(
                service_name="stripe_fees",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "disabled"},
            )

        try:
            total_fees, txn_count = await self._query_fees(
                start_date, end_date
            )
            return CostData(
                service_name="stripe_fees",
                amount=total_fees,
                start_date=start_date,
                end_date=end_date,
                breakdown={"processing_fees": total_fees},
                metadata={
                    "source": "stripe_api",
                    "transaction_count": txn_count,
                },
            )
        except Exception as exc:
            logger.error(
                "Stripe fee query failed",
                extra={"error": str(exc)},
            )
            return CostData(
                service_name="stripe_fees",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "error"},
            )

    async def _query_fees(
        self, start_date: date, end_date: date
    ) -> tuple[Decimal, int]:
        """Sum fee field from Stripe balance transactions."""
        url = "https://api.stripe.com/v1/balance_transactions"
        created_gte = int(
            datetime.combine(start_date, time.min).timestamp()
        )
        created_lte = int(
            datetime.combine(end_date, time.max).timestamp()
        )
        total_fees = Decimal("0")
        txn_count = 0
        has_more = True
        starting_after = None

        async with httpx.AsyncClient() as client:
            while has_more:
                params = {
                    "created[gte]": created_gte,
                    "created[lte]": created_lte,
                    "limit": 100,
                }
                if starting_after:
                    params["starting_after"] = starting_after

                resp = await client.get(
                    url,
                    params=params,
                    auth=(self._api_key, ""),
                    timeout=30.0,
                )
                resp.raise_for_status()
                data = resp.json()

                for txn in data.get("data", []):
                    fee_cents = txn.get("fee", 0)
                    total_fees += Decimal(str(fee_cents)) / 100
                    txn_count += 1

                has_more = data.get("has_more", False)
                txns = data.get("data", [])
                if txns:
                    starting_after = txns[-1]["id"]

        return total_fees, txn_count

    async def health_check(self) -> bool:
        """Verify Stripe API key."""
        if not self._api_key:
            return True
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.stripe.com/v1/balance",
                    auth=(self._api_key, ""),
                    timeout=10.0,
                )
                return resp.status_code == 200
        except Exception:
            return False
