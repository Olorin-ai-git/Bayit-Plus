"""Cost aggregation service for admin dashboard."""

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.cost_breakdown import (
    AICostBreakdown,
    CostBreakdown,
    CostMetrics,
    CostTotals,
    InfrastructureCostBreakdown,
    RevenueBreakdown,
    ThirdPartyCostBreakdown,
    UserCostBreakdown,
)
from app.services.olorin.metering.costs import (
    calculate_dubbing_cost,
    calculate_llm_cost,
    calculate_search_cost,
)

from .providers import (
    ConfigFallbackProvider,
    CostProvider,
    GCPBillingProvider,
    MongoDBAtlasProvider,
)

logger = get_logger(__name__)


class CostAggregationService:
    """Orchestrates cost aggregation from multiple providers."""

    def __init__(self):
        """Initialize with all cost providers."""
        self.gcp_provider = GCPBillingProvider()
        self.mongodb_provider = MongoDBAtlasProvider()
        self.fallback_provider = ConfigFallbackProvider()
        self.providers: List[CostProvider] = [
            self.gcp_provider,
            self.mongodb_provider,
            self.fallback_provider,
        ]

    async def aggregate_hourly_costs(self) -> CostBreakdown:
        """
        Aggregate costs for the last hour.

        Called by background job every hour.
        """
        now = datetime.utcnow()
        period_end = now.replace(minute=0, second=0, microsecond=0)
        period_start = period_end - timedelta(hours=1)

        logger.info(
            "Starting hourly cost aggregation",
            extra={
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
            },
        )

        # Aggregate AI costs from usage records
        ai_costs = await self._aggregate_ai_costs(period_start, period_end)

        # Fetch infrastructure costs
        infra_costs = await self._aggregate_infrastructure_costs(
            period_start, period_end
        )

        # Aggregate third-party costs
        third_party_costs = await self._aggregate_third_party_costs(
            period_start, period_end
        )

        # Calculate totals
        totals = CostTotals(
            permanent_cost=infra_costs.total,
            transient_cost=ai_costs.total + third_party_costs.total,
            platform_cost=(
                infra_costs.total + ai_costs.total + third_party_costs.total
            ),
        )

        # Fetch revenue data
        revenue = await self._aggregate_revenue(period_start, period_end)

        # Calculate metrics
        metrics = self._calculate_metrics(totals, revenue)

        # Create cost breakdown
        cost_breakdown = CostBreakdown(
            period_type="hourly",
            period_start=period_start,
            period_end=period_end,
            year=period_start.year,
            month=period_start.month,
            day_of_month=period_start.day,
            hour_of_day=period_start.hour,
            fiscal_quarter=self._get_fiscal_quarter(period_start.month),
            ai_costs=ai_costs,
            infrastructure_costs=infra_costs,
            thirdparty_costs=third_party_costs,
            totals=totals,
            revenue=revenue,
            metrics=metrics,
            is_finalized=False,
        )

        # Compute checksum
        cost_breakdown.checksum = cost_breakdown.compute_checksum()

        # Store to database (upsert for idempotency)
        await cost_breakdown.save()

        logger.info(
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
        """Aggregate AI service costs from usage records."""
        # Reuse existing cost calculation functions
        stt_cost = Decimal("0")
        tts_cost = Decimal("0")
        translation_cost = Decimal("0")
        llm_cost = Decimal("0")
        search_cost = Decimal("0")

        # Query usage records from database
        # Note: Actual implementation would query LiveFeatureUsageSession
        # and apply cost calculation functions

        return AICostBreakdown(
            stt_cost=stt_cost,
            tts_cost=tts_cost,
            translation_cost=translation_cost,
            llm_cost=llm_cost,
            search_cost=search_cost,
            total=stt_cost + tts_cost + translation_cost + llm_cost + search_cost,
        )

    async def _aggregate_infrastructure_costs(
        self, start: datetime, end: datetime
    ) -> InfrastructureCostBreakdown:
        """Aggregate infrastructure costs from cloud providers."""
        # Fetch from each provider concurrently
        gcp_data, mongodb_data = await asyncio.gather(
            self.gcp_provider.get_costs(start.date(), end.date()),
            self.mongodb_provider.get_costs(start.date(), end.date()),
        )

        # Firebase is config-only (quota-based)
        firebase_cost = Decimal(
            str(settings.olorin.infrastructure.firebase_monthly / (24 * 30))
        )
        sentry_cost = Decimal(
            str(settings.olorin.infrastructure.sentry_monthly / (24 * 30))
        )
        cdn_cost = Decimal(
            str(settings.olorin.infrastructure.cdn_monthly / (24 * 30))
        )

        total = gcp_data.amount + mongodb_data.amount + firebase_cost + sentry_cost + cdn_cost

        return InfrastructureCostBreakdown(
            gcp_cost=gcp_data.amount,
            mongodb_cost=mongodb_data.amount,
            firebase_cost=firebase_cost,
            sentry_cost=sentry_cost,
            cdn_cost=cdn_cost,
            total=total,
        )

    async def _aggregate_third_party_costs(
        self, start: datetime, end: datetime
    ) -> ThirdPartyCostBreakdown:
        """Aggregate third-party API costs from transaction logs."""
        # Query transactions for Stripe fees
        # Query dubbing sessions for ElevenLabs overage
        # Query SMS logs for Twilio costs
        # etc.

        return ThirdPartyCostBreakdown(
            stripe_fees=Decimal("0"),
            elevenlabs_cost=Decimal("0"),
            tmdb_cost=Decimal("0"),
            twilio_cost=Decimal("0"),
            sendgrid_cost=Decimal("0"),
            other_api_cost=Decimal("0"),
            total=Decimal("0"),
        )

    async def _aggregate_revenue(
        self, start: datetime, end: datetime
    ) -> RevenueBreakdown:
        """Aggregate revenue from subscriptions and transactions."""
        # Query subscription charges for period
        # Query one-time purchases for period
        # Calculate refunds for period

        return RevenueBreakdown(
            subscription_revenue=Decimal("0"),
            onetime_revenue=Decimal("0"),
            refunds=Decimal("0"),
            net_revenue=Decimal("0"),
        )

    def _calculate_metrics(
        self, totals: CostTotals, revenue: RevenueBreakdown
    ) -> CostMetrics:
        """Calculate derived metrics."""
        profit_loss = revenue.net_revenue - totals.platform_cost

        # Profit margin percentage
        if revenue.net_revenue > 0:
            profit_margin = (profit_loss / revenue.net_revenue) * Decimal("100")
        else:
            profit_margin = Decimal("0")

        # Cost per minute (placeholder)
        cost_per_minute = Decimal("0")

        return CostMetrics(
            profit_loss=profit_loss,
            profit_margin=profit_margin,
            cost_per_minute=cost_per_minute,
        )

    @staticmethod
    def _get_fiscal_quarter(month: int) -> int:
        """Get fiscal quarter from calendar month (assuming calendar year)."""
        if month <= 3:
            return 1
        elif month <= 6:
            return 2
        elif month <= 9:
            return 3
        else:
            return 4
