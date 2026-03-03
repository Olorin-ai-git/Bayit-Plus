"""Twilio usage records billing provider."""

from datetime import date
from decimal import Decimal

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)


class TwilioBillingProvider(CostProvider):
    """Fetches Twilio usage via daily records API."""

    def __init__(self):
        """Initialize with Twilio billing config.

        Falls back to main TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN
        when billing-specific credentials are not set.
        """
        cfg = settings.olorin.twilio_billing
        self._enabled = cfg.enabled
        self._account_sid = cfg.account_sid or getattr(
            settings, "TWILIO_ACCOUNT_SID", ""
        )
        self._auth_token = cfg.auth_token or getattr(
            settings, "TWILIO_AUTH_TOKEN", ""
        )

    @circuit_breaker("twilio_billing")
    async def get_costs(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Fetch Twilio daily usage records."""
        if not self._enabled or not self._account_sid:
            logger.debug("Twilio billing disabled")
            return CostData(
                service_name="twilio",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "disabled"},
            )

        try:
            total, by_category = await self._query_usage(
                start_date, end_date
            )
            return CostData(
                service_name="twilio",
                amount=total,
                start_date=start_date,
                end_date=end_date,
                breakdown=by_category,
                metadata={"source": "twilio_api"},
            )
        except Exception as exc:
            logger.error(
                "Twilio usage query failed",
                extra={"error": str(exc)},
            )
            return CostData(
                service_name="twilio",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "error"},
            )

    async def _query_usage(
        self, start_date: date, end_date: date
    ) -> tuple[Decimal, dict[str, Decimal]]:
        """Call Twilio Usage Records Daily endpoint."""
        base = "https://api.twilio.com/2010-04-01"
        url = f"{base}/Accounts/{self._account_sid}/Usage/Records/Daily.json"
        params = {
            "StartDate": start_date.isoformat(),
            "EndDate": end_date.isoformat(),
        }

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                params=params,
                auth=(self._account_sid, self._auth_token),
                timeout=30.0,
            )
            resp.raise_for_status()
            data = resp.json()

        total = Decimal("0")
        by_category: dict[str, Decimal] = {}

        for record in data.get("usage_records", []):
            price = Decimal(str(record.get("price", "0")))
            total += price
            category = record.get("category", "unknown")
            by_category[category] = (
                by_category.get(category, Decimal("0")) + price
            )

        return total, by_category

    async def health_check(self) -> bool:
        """Verify Twilio credentials."""
        if not self._enabled or not self._account_sid:
            return True
        try:
            base = "https://api.twilio.com/2010-04-01"
            url = f"{base}/Accounts/{self._account_sid}.json"
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    url,
                    auth=(self._account_sid, self._auth_token),
                    timeout=10.0,
                )
                return resp.status_code == 200
        except Exception:
            return False
