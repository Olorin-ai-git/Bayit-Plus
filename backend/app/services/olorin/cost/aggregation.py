"""Cost aggregation service for admin dashboard."""

import asyncio
import calendar
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List

from beanie.operators import In

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.cost_provider_settings import CostProviderSettings
from app.models.subscription import Invoice, Subscription, SUBSCRIPTION_PLANS
from app.models.cost_breakdown import (
    AICostBreakdown,
    CostBreakdown,
    CostMetrics,
    CostTotals,
    InfrastructureCostBreakdown,
    RevenueBreakdown,
    ThirdPartyCostBreakdown,
)

from .providers import (
    ConfigFallbackProvider,
    CostProvider,
    ElevenLabsBillingProvider,
    FixedCostsProvider,
    GCPBillingProvider,
    MongoDBAtlasProvider,
    OpenAIBillingProvider,
    PineconeBillingProvider,
    RedisCloudBillingProvider,
    StripeFeeProvider,
    TwilioBillingProvider,
)

logger = get_logger(__name__)


class CostAggregationService:
    """Orchestrates cost aggregation from multiple providers."""

    _CONFIG_KEY_MAP: dict[str, str] = {
        "gcp": "gcp_billing",
        "mongodb_atlas": "mongodb_billing",
        "openai": "openai_billing",
        "pinecone": "pinecone_billing",
        "twilio": "twilio_billing",
        "redis_cloud": "redis_cloud_billing",
    }

    def __init__(self):
        """Initialize with all cost providers."""
        self.gcp_provider = GCPBillingProvider()
        self.mongodb_provider = MongoDBAtlasProvider()
        self.fallback_provider = ConfigFallbackProvider()
        self.fixed_costs_provider = FixedCostsProvider()
        self.openai_provider = OpenAIBillingProvider()
        self.elevenlabs_provider = ElevenLabsBillingProvider()
        self.stripe_provider = StripeFeeProvider()
        self.pinecone_provider = PineconeBillingProvider()
        self.twilio_provider = TwilioBillingProvider()
        self.redis_provider = RedisCloudBillingProvider()
        self.providers: List[CostProvider] = [
            self.gcp_provider,
            self.mongodb_provider,
            self.fallback_provider,
            self.fixed_costs_provider,
            self.openai_provider,
            self.elevenlabs_provider,
            self.stripe_provider,
            self.pinecone_provider,
            self.twilio_provider,
            self.redis_provider,
        ]

    async def _is_provider_enabled(self, key: str) -> bool:
        """Check MongoDB override first, fall back to config."""
        try:
            override = await CostProviderSettings.find_one(
                CostProviderSettings.provider_key == key
            )
            if override is not None:
                return override.enabled
        except Exception as exc:
            logger.warning(
                "Failed to read provider toggle, using config",
                extra={"provider_key": key, "error": str(exc)},
            )

        config_attr = self._CONFIG_KEY_MAP.get(key)
        if config_attr is None:
            return True
        billing_cfg = getattr(settings.olorin, config_attr, None)
        if billing_cfg is None:
            return True
        return getattr(billing_cfg, "enabled", True)

    async def aggregate_hourly_costs(self) -> CostBreakdown:
        """Aggregate costs for the last hour."""
        now = datetime.utcnow()
        period_end = now.replace(minute=0, second=0, microsecond=0)
        period_start = period_end - timedelta(hours=1)

        logger.debug(
            "Starting hourly cost aggregation",
            extra={
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
            },
        )

        ai_costs = await self._aggregate_ai_costs(
            period_start, period_end
        )
        infra_costs = await self._aggregate_infrastructure_costs(
            period_start, period_end
        )
        third_party_costs = await self._aggregate_third_party_costs(
            period_start, period_end
        )

        totals = CostTotals(
            permanent_cost=infra_costs.total,
            transient_cost=ai_costs.total + third_party_costs.total,
            platform_cost=(
                infra_costs.total
                + ai_costs.total
                + third_party_costs.total
            ),
        )

        revenue = await self._aggregate_revenue(
            period_start, period_end
        )
        metrics = self._calculate_metrics(totals, revenue)

        cost_breakdown = CostBreakdown(
            period_type="hourly",
            period_start=period_start,
            period_end=period_end,
            year=period_start.year,
            month=period_start.month,
            day_of_month=period_start.day,
            hour_of_day=period_start.hour,
            fiscal_quarter=self._get_fiscal_quarter(
                period_start.month
            ),
            ai_costs=ai_costs,
            infrastructure_costs=infra_costs,
            thirdparty_costs=third_party_costs,
            totals=totals,
            revenue=revenue,
            metrics=metrics,
            is_finalized=False,
        )

        cost_breakdown.checksum = cost_breakdown.compute_checksum()
        await cost_breakdown.save()

        logger.debug(
            "Hourly cost aggregation completed",
            extra={
                "total_cost": str(totals.platform_cost),
                "net_revenue": str(revenue.net_revenue),
            },
        )

        return cost_breakdown

    async def _aggregate_ai_costs(
        self, start: datetime, end: datetime
    ) -> AICostBreakdown:
        """Aggregate AI service costs from providers."""
        openai_enabled, el_enabled = await asyncio.gather(
            self._is_provider_enabled("openai"),
            self._is_provider_enabled("elevenlabs"),
        )

        llm_cost = Decimal("0")
        tts_cost = Decimal("0")

        coros = {}
        if openai_enabled:
            coros["openai"] = self.openai_provider.get_costs(
                start.date(), end.date()
            )
        if el_enabled:
            coros["elevenlabs"] = self.elevenlabs_provider.get_costs(
                start.date(), end.date()
            )

        if coros:
            results = await asyncio.gather(*coros.values())
            for key, data in zip(coros.keys(), results):
                if key == "openai":
                    llm_cost = data.amount
                elif key == "elevenlabs":
                    tts_cost = data.amount

        stt_cost = Decimal("0")
        translation_cost = Decimal("0")
        search_cost = Decimal("0")

        return AICostBreakdown(
            stt_cost=stt_cost,
            tts_cost=tts_cost,
            translation_cost=translation_cost,
            llm_cost=llm_cost,
            search_cost=search_cost,
            total=(
                stt_cost
                + tts_cost
                + translation_cost
                + llm_cost
                + search_cost
            ),
        )

    async def _aggregate_infrastructure_costs(
        self, start: datetime, end: datetime
    ) -> InfrastructureCostBreakdown:
        """Aggregate infrastructure costs from cloud providers."""
        gcp_on, mongo_on, fixed_on = await asyncio.gather(
            self._is_provider_enabled("gcp"),
            self._is_provider_enabled("mongodb_atlas"),
            self._is_provider_enabled("fixed_costs"),
        )

        coros = {}
        if gcp_on:
            coros["gcp"] = self.gcp_provider.get_costs(
                start.date(), end.date()
            )
        if mongo_on:
            coros["mongodb"] = self.mongodb_provider.get_costs(
                start.date(), end.date()
            )
        if fixed_on:
            coros["fixed"] = self.fixed_costs_provider.get_costs(
                start.date(), end.date()
            )

        gcp_amount = Decimal("0")
        mongodb_amount = Decimal("0")
        fixed_amount = Decimal("0")

        if coros:
            results = await asyncio.gather(*coros.values())
            for key, data in zip(coros.keys(), results):
                if key == "gcp":
                    gcp_amount = data.amount
                elif key == "mongodb":
                    mongodb_amount = data.amount
                elif key == "fixed":
                    fixed_amount = data.amount

        firebase_cost = Decimal(
            str(
                settings.olorin.infrastructure.firebase_monthly
                / (24 * 30)
            )
        )
        sentry_cost = Decimal(
            str(
                settings.olorin.infrastructure.sentry_monthly
                / (24 * 30)
            )
        )
        cdn_cost = Decimal(
            str(
                settings.olorin.infrastructure.cdn_monthly / (24 * 30)
            )
        )

        total = (
            gcp_amount
            + mongodb_amount
            + firebase_cost
            + sentry_cost
            + cdn_cost
            + fixed_amount
        )

        return InfrastructureCostBreakdown(
            gcp_cost=gcp_amount,
            mongodb_cost=mongodb_amount,
            firebase_cost=firebase_cost,
            sentry_cost=sentry_cost,
            cdn_cost=cdn_cost,
            total=total,
        )

    async def _aggregate_third_party_costs(
        self, start: datetime, end: datetime
    ) -> ThirdPartyCostBreakdown:
        """Aggregate third-party API costs from providers."""
        stripe_on, twilio_on, pine_on, redis_on = (
            await asyncio.gather(
                self._is_provider_enabled("stripe"),
                self._is_provider_enabled("twilio"),
                self._is_provider_enabled("pinecone"),
                self._is_provider_enabled("redis_cloud"),
            )
        )

        coros = {}
        if stripe_on:
            coros["stripe"] = self.stripe_provider.get_costs(
                start.date(), end.date()
            )
        if twilio_on:
            coros["twilio"] = self.twilio_provider.get_costs(
                start.date(), end.date()
            )
        if pine_on:
            coros["pinecone"] = self.pinecone_provider.get_costs(
                start.date(), end.date()
            )
        if redis_on:
            coros["redis"] = self.redis_provider.get_costs(
                start.date(), end.date()
            )

        stripe_amount = Decimal("0")
        twilio_amount = Decimal("0")
        pinecone_amount = Decimal("0")
        redis_amount = Decimal("0")

        if coros:
            results = await asyncio.gather(*coros.values())
            for key, data in zip(coros.keys(), results):
                if key == "stripe":
                    stripe_amount = data.amount
                elif key == "twilio":
                    twilio_amount = data.amount
                elif key == "pinecone":
                    pinecone_amount = data.amount
                elif key == "redis":
                    redis_amount = data.amount

        other = pinecone_amount + redis_amount
        total = stripe_amount + twilio_amount + other

        return ThirdPartyCostBreakdown(
            stripe_fees=stripe_amount,
            elevenlabs_cost=Decimal("0"),
            tmdb_cost=Decimal("0"),
            twilio_cost=twilio_amount,
            sendgrid_cost=Decimal("0"),
            other_api_cost=other,
            total=total,
        )

    async def _aggregate_revenue(
        self, start: datetime, end: datetime
    ) -> RevenueBreakdown:
        """Aggregate revenue from active subscriptions and invoices."""
        sub_rev, invoice_rev, refund_total = await asyncio.gather(
            self._calc_subscription_revenue(start, end),
            self._calc_invoice_revenue(start, end),
            self._calc_refunds(start, end),
        )

        net = sub_rev + invoice_rev - refund_total

        return RevenueBreakdown(
            subscription_revenue=sub_rev,
            onetime_revenue=invoice_rev,
            refunds=refund_total,
            net_revenue=net,
        )

    async def _calc_subscription_revenue(
        self, start: datetime, end: datetime
    ) -> Decimal:
        """Prorate active subscription revenue to the aggregation period."""
        active_subs = await Subscription.find(
            In(Subscription.status, ["active", "trialing"]),
        ).to_list()

        hours_in_month = Decimal(
            str(
                calendar.monthrange(start.year, start.month)[1] * 24
            )
        )
        period_hours = Decimal(
            str((end - start).total_seconds() / 3600)
        )

        total = Decimal("0")
        for sub in active_subs:
            plan = SUBSCRIPTION_PLANS.get(sub.plan_id)
            if not plan:
                continue

            if sub.billing_period == "yearly":
                monthly_price = Decimal(str(plan.price_yearly)) / 12
            else:
                monthly_price = Decimal(str(plan.price))

            hourly_rate = monthly_price / hours_in_month
            total += hourly_rate * period_hours

        return total.quantize(Decimal("0.01"))

    async def _calc_invoice_revenue(
        self, start: datetime, end: datetime
    ) -> Decimal:
        """Sum paid invoices in the period (non-subscription one-time payments)."""
        paid_invoices = await Invoice.find(
            Invoice.status == "paid",
            Invoice.paid_at >= start,
            Invoice.paid_at < end,
        ).to_list()

        # Only count invoices not tied to a subscription
        total = Decimal("0")
        for inv in paid_invoices:
            if not inv.subscription_id:
                total += Decimal(str(inv.amount))

        return total.quantize(Decimal("0.01"))

    async def _calc_refunds(
        self, start: datetime, end: datetime
    ) -> Decimal:
        """Sum voided/refunded invoices in the period."""
        refunded = await Invoice.find(
            In(Invoice.status, ["void", "uncollectible"]),
            Invoice.created_at >= start,
            Invoice.created_at < end,
        ).to_list()

        total = sum(
            (Decimal(str(inv.amount)) for inv in refunded),
            Decimal("0"),
        )
        return total.quantize(Decimal("0.01"))

    def _calculate_metrics(
        self, totals: CostTotals, revenue: RevenueBreakdown
    ) -> CostMetrics:
        """Calculate derived metrics."""
        profit_loss = revenue.net_revenue - totals.platform_cost

        if revenue.net_revenue > 0:
            profit_margin = (
                profit_loss / revenue.net_revenue
            ) * Decimal("100")
        else:
            profit_margin = Decimal("0")

        cost_per_minute = Decimal("0")

        return CostMetrics(
            profit_loss=profit_loss,
            profit_margin=profit_margin,
            cost_per_minute=cost_per_minute,
        )

    @staticmethod
    def _get_fiscal_quarter(month: int) -> int:
        """Get fiscal quarter from calendar month."""
        if month <= 3:
            return 1
        elif month <= 6:
            return 2
        elif month <= 9:
            return 3
        else:
            return 4
