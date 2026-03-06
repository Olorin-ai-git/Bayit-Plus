"""Tests for cost aggregation service."""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.olorin.cost.aggregation import CostAggregationService
from app.services.olorin.cost.providers.base import CostData
from app.models.cost_breakdown import (
    AICostBreakdown,
    CostBreakdown,
    CostMetrics,
    CostTotals,
    InfrastructureCostBreakdown,
    RevenueBreakdown,
    ThirdPartyCostBreakdown,
)


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

    @pytest.mark.asyncio
    async def test_subscription_revenue_monthly(
        self, mock_settings, mock_all_providers
    ):
        """Test subscription revenue proration for 1-hour window."""
        mock_sub = MagicMock()
        mock_sub.plan_id = "premium"
        mock_sub.billing_period = "monthly"
        mock_sub.status = "active"

        with patch(
            "app.services.olorin.cost.aggregation.Subscription"
        ) as mock_sub_cls:
            mock_sub_cls.find.return_value.to_list = AsyncMock(
                return_value=[mock_sub]
            )
            mock_sub_cls.status = MagicMock()

            svc = CostAggregationService()
            start = datetime(2026, 3, 1, 10, 0)
            end = datetime(2026, 3, 1, 11, 0)
            result = await svc._calc_subscription_revenue(start, end)

            # premium = $14.99/month, March has 31 days = 744 hours
            # hourly = 14.99 / 744 = ~0.02015
            assert result > Decimal("0")
            assert result < Decimal("1")

    @pytest.mark.asyncio
    async def test_subscription_revenue_yearly(
        self, mock_settings, mock_all_providers
    ):
        """Test yearly subscription revenue proration."""
        mock_sub = MagicMock()
        mock_sub.plan_id = "family"
        mock_sub.billing_period = "yearly"
        mock_sub.status = "active"

        with patch(
            "app.services.olorin.cost.aggregation.Subscription"
        ) as mock_sub_cls:
            mock_sub_cls.find.return_value.to_list = AsyncMock(
                return_value=[mock_sub]
            )
            mock_sub_cls.status = MagicMock()

            svc = CostAggregationService()
            start = datetime(2026, 3, 1, 10, 0)
            end = datetime(2026, 3, 1, 11, 0)
            result = await svc._calc_subscription_revenue(start, end)

            # family yearly = $199.90/12 = ~$16.66/month
            assert result > Decimal("0")
            assert result < Decimal("1")

    @pytest.mark.asyncio
    async def test_invoice_revenue_excludes_subscription(
        self, mock_settings, mock_all_providers
    ):
        """One-time invoice revenue excludes subscription invoices."""
        sub_invoice = MagicMock()
        sub_invoice.subscription_id = "sub_123"
        sub_invoice.amount = 14.99

        onetime_invoice = MagicMock()
        onetime_invoice.subscription_id = ""
        onetime_invoice.amount = 49.99

        with patch(
            "app.services.olorin.cost.aggregation.Invoice"
        ) as mock_inv:
            mock_inv.find.return_value.to_list = AsyncMock(
                return_value=[sub_invoice, onetime_invoice]
            )
            mock_inv.status.__eq__ = lambda self, other: MagicMock()
            mock_inv.paid_at.__ge__ = lambda self, other: MagicMock()
            mock_inv.paid_at.__lt__ = lambda self, other: MagicMock()

            svc = CostAggregationService()
            start = datetime(2026, 3, 1)
            end = datetime(2026, 3, 2)
            result = await svc._calc_invoice_revenue(start, end)

            assert result == Decimal("49.99")

    @pytest.mark.asyncio
    async def test_refunds_sums_voided_invoices(
        self, mock_settings, mock_all_providers
    ):
        """Refunds sum voided and uncollectible invoices."""
        inv1 = MagicMock(amount=9.99)
        inv2 = MagicMock(amount=14.99)

        with patch(
            "app.services.olorin.cost.aggregation.Invoice"
        ) as mock_inv:
            mock_inv.find.return_value.to_list = AsyncMock(
                return_value=[inv1, inv2]
            )
            mock_inv.status.is_in = MagicMock(return_value=MagicMock())
            mock_inv.created_at.__ge__ = lambda self, other: MagicMock()
            mock_inv.created_at.__lt__ = lambda self, other: MagicMock()

            svc = CostAggregationService()
            start = datetime(2026, 3, 1)
            end = datetime(2026, 3, 2)
            result = await svc._calc_refunds(start, end)

            assert result == Decimal("24.98")

    @pytest.mark.asyncio
    async def test_aggregate_revenue_combines_all(
        self, mock_settings, mock_all_providers
    ):
        """Full revenue aggregation combines sub + onetime - refunds."""
        svc = CostAggregationService()
        svc._calc_subscription_revenue = AsyncMock(
            return_value=Decimal("100.00")
        )
        svc._calc_invoice_revenue = AsyncMock(
            return_value=Decimal("50.00")
        )
        svc._calc_refunds = AsyncMock(
            return_value=Decimal("10.00")
        )

        start = datetime(2026, 3, 1)
        end = datetime(2026, 3, 2)
        result = await svc._aggregate_revenue(start, end)

        assert result.subscription_revenue == Decimal("100.00")
        assert result.onetime_revenue == Decimal("50.00")
        assert result.refunds == Decimal("10.00")
        assert result.net_revenue == Decimal("140.00")


class TestMonthlyCostRollup:
    """Test the monthly rollup aggregation logic."""

    def _make_doc(
        self,
        ai_total: Decimal,
        infra_total: Decimal,
        tp_total: Decimal,
        sub_rev: Decimal,
    ) -> CostBreakdown:
        return CostBreakdown.model_construct(
            period_type="daily",
            period_start=datetime(2026, 2, 1),
            period_end=datetime(2026, 2, 2),
            year=2026,
            month=2,
            ai_costs=AICostBreakdown(
                llm_cost=ai_total, total=ai_total
            ),
            infrastructure_costs=InfrastructureCostBreakdown(
                gcp_cost=infra_total, total=infra_total
            ),
            thirdparty_costs=ThirdPartyCostBreakdown(
                stripe_fees=tp_total, total=tp_total
            ),
            totals=CostTotals(
                permanent_cost=infra_total,
                transient_cost=ai_total + tp_total,
                platform_cost=ai_total + infra_total + tp_total,
            ),
            revenue=RevenueBreakdown(
                subscription_revenue=sub_rev,
                net_revenue=sub_rev,
            ),
            metrics=CostMetrics(),
        )

    @pytest.fixture(autouse=True)
    def _patch_beanie(self):
        """Bypass Beanie collection init for CostBreakdown."""
        with patch(
            "app.services.olorin.cost.jobs.cost_rollup.CostBreakdown",
        ) as mock_cls:
            mock_cls.side_effect = (
                lambda **kw: CostBreakdown.model_construct(**kw)
            )
            yield

    def test_sum_cost_docs(self):
        from app.services.olorin.cost.jobs.cost_rollup import (
            _sum_cost_docs,
        )

        docs = [
            self._make_doc(
                Decimal("10"), Decimal("20"), Decimal("5"), Decimal("50")
            ),
            self._make_doc(
                Decimal("15"), Decimal("25"), Decimal("8"), Decimal("60")
            ),
        ]
        result = _sum_cost_docs(
            docs,
            datetime(2026, 2, 1),
            datetime(2026, 3, 1),
        )
        assert result.period_type == "monthly"
        assert result.ai_costs.llm_cost == Decimal("25")
        assert result.infrastructure_costs.gcp_cost == Decimal("45")
        assert result.thirdparty_costs.stripe_fees == Decimal("13")
        assert result.totals.platform_cost == Decimal("83")
        assert result.revenue.subscription_revenue == Decimal("110")
        assert result.revenue.net_revenue == Decimal("110")
        assert result.metrics.profit_loss == Decimal("27")
        assert result.source_record_count == 2

    def test_sum_cost_docs_empty(self):
        from app.services.olorin.cost.jobs.cost_rollup import (
            _sum_cost_docs,
        )

        result = _sum_cost_docs(
            [],
            datetime(2026, 2, 1),
            datetime(2026, 3, 1),
        )
        assert result.totals.platform_cost == Decimal("0")
        assert result.revenue.net_revenue == Decimal("0")
