"""OpenAI billing provider via organization costs API."""

from datetime import date
from decimal import Decimal

from app.core.ai_clients import ProviderOperationTimeouts, get_provider_http_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)


class OpenAIBillingProvider(CostProvider):
    """Fetches costs from OpenAI organization costs endpoint."""

    def __init__(self):
        """Initialize with OpenAI billing config.

        Falls back to main OPENAI_API_KEY when billing-specific key
        is not set, avoiding duplicate secret management.
        """
        cfg = settings.olorin.openai_billing
        self._enabled = cfg.enabled
        self._api_key = cfg.api_key or getattr(
            settings, "OPENAI_API_KEY", ""
        )

    @circuit_breaker("openai_billing")
    async def get_costs(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Fetch OpenAI costs for the given period."""
        if not self._enabled or not self._api_key:
            logger.debug("OpenAI billing disabled")
            return CostData(
                service_name="openai",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "disabled"},
            )

        try:
            total, by_model = await self._query_costs(
                start_date, end_date
            )
            return CostData(
                service_name="openai",
                amount=total,
                start_date=start_date,
                end_date=end_date,
                breakdown=by_model,
                metadata={"source": "openai_api"},
            )
        except Exception as exc:
            logger.error(
                "OpenAI billing query failed",
                extra={"error": str(exc)},
            )
            return CostData(
                service_name="openai",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "error", "error": str(exc)},
            )

    async def _query_costs(
        self, start_date: date, end_date: date
    ) -> tuple[Decimal, dict[str, Decimal]]:
        """Call OpenAI organization costs endpoint."""
        url = "https://api.openai.com/v1/organization/costs"
        params = {
            "start_time": int(
                __import__("datetime")
                .datetime.combine(start_date, __import__("datetime").time.min)
                .timestamp()
            ),
            "end_time": int(
                __import__("datetime")
                .datetime.combine(end_date, __import__("datetime").time.max)
                .timestamp()
            ),
            "group_by": ["line_item"],
        }

        client = get_provider_http_client()
        operation_timeouts = ProviderOperationTimeouts.from_settings()
        resp = await client.get(
            url,
            params=params,
            headers={"Authorization": f"Bearer {self._api_key}"},
            timeout=operation_timeouts.openai_billing,
        )
        resp.raise_for_status()
        data = resp.json()

        total = Decimal("0")
        by_model: dict[str, Decimal] = {}

        for bucket in data.get("data", []):
            for result in bucket.get("results", []):
                cost = Decimal(str(result.get("amount", {}).get("value", 0)))
                total += cost
                model = result.get("line_item", "unknown")
                by_model[model] = by_model.get(model, Decimal("0")) + cost

        return total, by_model

    async def health_check(self) -> bool:
        """Verify OpenAI API key is valid."""
        if not self._enabled:
            return True
        try:
            client = get_provider_http_client()
            operation_timeouts = ProviderOperationTimeouts.from_settings()
            resp = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=operation_timeouts.openai_billing_health,
            )
            return resp.status_code == 200
        except Exception:
            return False
