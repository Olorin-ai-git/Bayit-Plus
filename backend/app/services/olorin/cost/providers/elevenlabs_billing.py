"""ElevenLabs billing provider via usage stats API."""

from datetime import date
from decimal import Decimal

import httpx

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.resilience import circuit_breaker

from .base import CostData, CostProvider

logger = get_logger(__name__)


class ElevenLabsBillingProvider(CostProvider):
    """Estimates ElevenLabs costs from character usage stats."""

    def __init__(self):
        """Initialize with ElevenLabs config."""
        self._api_key = getattr(settings, "ELEVENLABS_API_KEY", "")
        self._rate = settings.olorin.thirdparty.elevenlabs_overage_per_1k_chars

    @circuit_breaker("elevenlabs_billing")
    async def get_costs(
        self, start_date: date, end_date: date
    ) -> CostData:
        """Fetch ElevenLabs character usage and compute cost."""
        if not self._api_key:
            logger.debug("ElevenLabs API key not set")
            return CostData(
                service_name="elevenlabs",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "disabled"},
            )

        try:
            total_chars, by_voice = await self._query_usage(
                start_date, end_date
            )
            cost = Decimal(str(total_chars)) / 1000 * Decimal(str(self._rate))
            breakdown = {
                k: Decimal(str(v)) / 1000 * Decimal(str(self._rate))
                for k, v in by_voice.items()
            }
            return CostData(
                service_name="elevenlabs",
                amount=cost,
                start_date=start_date,
                end_date=end_date,
                breakdown=breakdown,
                metadata={
                    "source": "elevenlabs_api",
                    "total_characters": total_chars,
                },
            )
        except Exception as exc:
            logger.error(
                "ElevenLabs usage query failed",
                extra={"error": str(exc)},
            )
            return CostData(
                service_name="elevenlabs",
                amount=Decimal("0"),
                start_date=start_date,
                end_date=end_date,
                metadata={"source": "error"},
            )

    async def _query_usage(
        self, start_date: date, end_date: date
    ) -> tuple[int, dict[str, int]]:
        """Call ElevenLabs character stats endpoint."""
        url = "https://api.elevenlabs.io/v1/usage/character-stats"
        params = {
            "start_unix": int(
                __import__("datetime")
                .datetime.combine(start_date, __import__("datetime").time.min)
                .timestamp()
            ),
            "end_unix": int(
                __import__("datetime")
                .datetime.combine(end_date, __import__("datetime").time.max)
                .timestamp()
            ),
        }

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                params=params,
                headers={"xi-api-key": self._api_key},
                timeout=30.0,
            )
            resp.raise_for_status()
            data = resp.json()

        total = 0
        by_voice: dict[str, int] = {}
        for entry in data.get("usage", []):
            chars = entry.get("character_count", 0)
            total += chars
            voice = entry.get("voice_name", "unknown")
            by_voice[voice] = by_voice.get(voice, 0) + chars

        return total, by_voice

    async def health_check(self) -> bool:
        """Verify ElevenLabs API key."""
        if not self._api_key:
            return True
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.elevenlabs.io/v1/user",
                    headers={"xi-api-key": self._api_key},
                    timeout=10.0,
                )
                return resp.status_code == 200
        except Exception:
            return False
