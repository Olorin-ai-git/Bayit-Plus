"""Tests for cost aggregation service."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.olorin.cost.aggregation import CostAggregationService
from app.services.olorin.cost.providers.base import CostData


def _make_cost_data(name: str, amount: Decimal) -> CostData:
    return CostData(
        service_name=name,
        amount=amount,
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 2),
    )


@pytest.fixture
def mock_settings():
    """Mock all settings for aggregation."""
    with patch("app.services.olorin.cost.aggregation.settings") as mock:
        mock.olorin.infrastructure.firebase_monthly = 300.0
        mock.olorin.infrastructure.sentry_monthly = 100.0
        mock.olorin.infrastructure.cdn_monthly = 200.0
        yield mock


@pytest.fixture
def mock_all_providers():
    """Patch all provider constructors to return mocks."""
    patches = {}
    provider_classes = [
        "GCPBillingProvider",
        "MongoDBAtlasProvider",
        "ConfigFallbackProvider",
        "FixedCostsProvider",
        "OpenAIBillingProvider",
        "ElevenLabsBillingProvider",
        "StripeFeeProvider",
        "PineconeBillingProvider",
        "TwilioBillingProvider",
        "RedisCloudBillingProvider",
    ]
    for cls_name in provider_classes:
        p = patch(
            f"app.services.olorin.cost.aggregation.{cls_name}",
            return_value=MagicMock(),
        )
        patches[cls_name] = p.start()

    yield patches

    for p in patches.values():
        p.stop()


class TestCostAggregationService:
    """Test the aggregation orchestrator."""

    @pytest.mark.asyncio
    async def test_ai_costs_aggregates_openai_and_elevenlabs(
        self, mock_settings, mock_all_providers
    ):
        svc = CostAggregationService()
        svc.openai_provider.get_costs = AsyncMock(
            return_value=_make_cost_data("openai", Decimal("25"))
        )
        svc.elevenlabs_provider.get_costs = AsyncMock(
            return_value=_make_cost_data("elevenlabs", Decimal("10"))
        )

        start = datetime(2026, 3, 1)
        end = datetime(2026, 3, 2)
        result = await svc._aggregate_ai_costs(start, end)
        assert result.llm_cost == Decimal("25")
        assert result.tts_cost == Decimal("10")
        assert result.total == Decimal("35")

    @pytest.mark.asyncio
    async def test_infra_costs_sums_all_providers(
        self, mock_settings, mock_all_providers
    ):
        svc = CostAggregationService()
        svc.gcp_provider.get_costs = AsyncMock(
            return_value=_make_cost_data("gcp", Decimal("100"))
        )
        svc.mongodb_provider.get_costs = AsyncMock(
            return_value=_make_cost_data("mongodb", Decimal("50"))
        )
        svc.fixed_costs_provider.get_costs = AsyncMock(
            return_value=_make_cost_data("fixed", Decimal("20"))
        )

        start = datetime(2026, 3, 1)
        end = datetime(2026, 3, 2)
        result = await svc._aggregate_infrastructure_costs(start, end)
        assert result.gcp_cost == Decimal("100")
        assert result.mongodb_cost == Decimal("50")
        assert result.total > Decimal("170")

    @pytest.mark.asyncio
    async def test_third_party_costs_aggregates(
        self, mock_settings, mock_all_providers
    ):
        svc = CostAggregationService()
        svc.stripe_provider.get_costs = AsyncMock(
            return_value=_make_cost_data("stripe", Decimal("15"))
        )
        svc.twilio_provider.get_costs = AsyncMock(
            return_value=_make_cost_data("twilio", Decimal("5"))
        )
        svc.pinecone_provider.get_costs = AsyncMock(
            return_value=_make_cost_data("pinecone", Decimal("3"))
        )
        svc.redis_provider.get_costs = AsyncMock(
            return_value=_make_cost_data("redis", Decimal("7"))
        )

        start = datetime(2026, 3, 1)
        end = datetime(2026, 3, 2)
        result = await svc._aggregate_third_party_costs(start, end)
        assert result.stripe_fees == Decimal("15")
        assert result.twilio_cost == Decimal("5")
        assert result.total == Decimal("30")

    def test_fiscal_quarter_calculation(self):
        assert CostAggregationService._get_fiscal_quarter(1) == 1
        assert CostAggregationService._get_fiscal_quarter(6) == 2
        assert CostAggregationService._get_fiscal_quarter(9) == 3
        assert CostAggregationService._get_fiscal_quarter(12) == 4
