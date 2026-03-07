"""Cost aggregation background jobs (hourly + monthly rollup)."""

import asyncio
import calendar
from datetime import datetime, timedelta
from decimal import Decimal

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
)
from app.services.olorin.cost.aggregation import CostAggregationService

logger = get_logger(__name__)


async def cost_rollup_job() -> None:
    """
    Hourly cost aggregation job.

    Runs every hour to aggregate costs from the previous hour and store
    system-wide and per-user cost breakdowns.

    Called by background task manager in app startup.
    """
    aggregation_service = CostAggregationService()
    interval_minutes = settings.olorin.cost_aggregation.interval_minutes

    # Wait for server initialization
    await asyncio.sleep(60)

    while True:
        try:
            logger.debug("Starting hourly cost aggregation")

            # Aggregate costs for the previous hour
            cost_breakdown = await aggregation_service.aggregate_hourly_costs()

            logger.debug(
                "Hourly cost aggregation completed",
                extra={
                    "period_start": cost_breakdown.period_start.isoformat(),
                    "period_end": cost_breakdown.period_end.isoformat(),
                    "total_cost": str(cost_breakdown.totals.platform_cost),
                },
            )

        except asyncio.CancelledError:
            logger.debug("Cost rollup job cancelled")
            break

        except Exception as e:
            logger.error(
                f"Cost rollup error: {e}",
                extra={"error": str(e)},
                exc_info=True,
            )

        # Sleep for configured interval
        await asyncio.sleep(interval_minutes * 60)


async def monthly_cost_rollup_job() -> None:
    """
    Monthly cost aggregation job.

    Aggregates daily costs into monthly summaries for faster historical queries.
    Runs once per day, produces a monthly doc on the 1st for the previous month.
    """
    # Wait for server initialization
    await asyncio.sleep(120)

    while True:
        try:
            now = datetime.utcnow()
            if now.day != 1:
                days_until_next_month = (
                    (now.replace(day=1) + timedelta(days=32)).replace(day=1) - now
                ).days
                await asyncio.sleep(days_until_next_month * 24 * 3600)
                continue

            logger.debug("Starting monthly cost aggregation")

            prev_month_end = now.replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            prev_month_start = (prev_month_end - timedelta(days=1)).replace(day=1)

            existing = await CostBreakdown.find_one(
                CostBreakdown.period_type == "monthly",
                CostBreakdown.period_start == prev_month_start,
            )
            if existing:
                logger.debug(
                    "Monthly rollup already exists, skipping",
                    extra={"period_start": prev_month_start.isoformat()},
                )
                await asyncio.sleep(86400)
                continue

            daily_docs = await CostBreakdown.find(
                CostBreakdown.period_type == "daily",
                CostBreakdown.period_start >= prev_month_start,
                CostBreakdown.period_start < prev_month_end,
            ).to_list()

            if not daily_docs:
                hourly_docs = await CostBreakdown.find(
                    CostBreakdown.period_type == "hourly",
                    CostBreakdown.period_start >= prev_month_start,
                    CostBreakdown.period_start < prev_month_end,
                ).to_list()
                docs = hourly_docs
            else:
                docs = daily_docs

            if not docs:
                logger.debug("No cost docs found for previous month")
                await asyncio.sleep(86400)
                continue

            monthly = _sum_cost_docs(
                docs, prev_month_start, prev_month_end
            )
            monthly.checksum = monthly.compute_checksum()
            monthly.is_finalized = True
            await monthly.save()

            logger.debug(
                "Monthly cost aggregation completed",
                extra={
                    "period": prev_month_start.strftime("%Y-%m"),
                    "total_cost": str(monthly.totals.platform_cost),
                    "net_revenue": str(monthly.revenue.net_revenue),
                    "source_records": monthly.source_record_count,
                },
            )

        except asyncio.CancelledError:
            logger.debug("Monthly cost rollup job cancelled")
            break

        except Exception as e:
            logger.error(
                "Monthly cost rollup error",
                extra={"error": str(e)},
                exc_info=True,
            )

        await asyncio.sleep(86400)


def _sum_cost_docs(
    docs: list[CostBreakdown],
    period_start: datetime,
    period_end: datetime,
) -> CostBreakdown:
    """Sum a list of CostBreakdown docs into a single monthly doc."""
    z = Decimal("0")

    ai = AICostBreakdown(
        stt_cost=sum((d.ai_costs.stt_cost for d in docs), z),
        tts_cost=sum((d.ai_costs.tts_cost for d in docs), z),
        translation_cost=sum((d.ai_costs.translation_cost for d in docs), z),
        llm_cost=sum((d.ai_costs.llm_cost for d in docs), z),
        search_cost=sum((d.ai_costs.search_cost for d in docs), z),
        total=sum((d.ai_costs.total for d in docs), z),
    )
    infra = InfrastructureCostBreakdown(
        gcp_cost=sum((d.infrastructure_costs.gcp_cost for d in docs), z),
        mongodb_cost=sum((d.infrastructure_costs.mongodb_cost for d in docs), z),
        firebase_cost=sum((d.infrastructure_costs.firebase_cost for d in docs), z),
        sentry_cost=sum((d.infrastructure_costs.sentry_cost for d in docs), z),
        cdn_cost=sum((d.infrastructure_costs.cdn_cost for d in docs), z),
        total=sum((d.infrastructure_costs.total for d in docs), z),
    )
    tp = ThirdPartyCostBreakdown(
        stripe_fees=sum((d.thirdparty_costs.stripe_fees for d in docs), z),
        elevenlabs_cost=sum((d.thirdparty_costs.elevenlabs_cost for d in docs), z),
        tmdb_cost=sum((d.thirdparty_costs.tmdb_cost for d in docs), z),
        twilio_cost=sum((d.thirdparty_costs.twilio_cost for d in docs), z),
        sendgrid_cost=sum((d.thirdparty_costs.sendgrid_cost for d in docs), z),
        other_api_cost=sum((d.thirdparty_costs.other_api_cost for d in docs), z),
        total=sum((d.thirdparty_costs.total for d in docs), z),
    )
    rev = RevenueBreakdown(
        subscription_revenue=sum((d.revenue.subscription_revenue for d in docs), z),
        onetime_revenue=sum((d.revenue.onetime_revenue for d in docs), z),
        refunds=sum((d.revenue.refunds for d in docs), z),
        net_revenue=sum((d.revenue.net_revenue for d in docs), z),
    )
    totals = CostTotals(
        permanent_cost=sum((d.totals.permanent_cost for d in docs), z),
        transient_cost=sum((d.totals.transient_cost for d in docs), z),
        platform_cost=sum((d.totals.platform_cost for d in docs), z),
    )

    net_pl = rev.net_revenue - totals.platform_cost
    margin = (
        (net_pl / rev.net_revenue * 100) if rev.net_revenue > 0 else z
    )

    return CostBreakdown(
        period_type="monthly",
        period_start=period_start,
        period_end=period_end,
        year=period_start.year,
        month=period_start.month,
        fiscal_quarter=CostAggregationService._get_fiscal_quarter(
            period_start.month
        ),
        ai_costs=ai,
        infrastructure_costs=infra,
        thirdparty_costs=tp,
        totals=totals,
        revenue=rev,
        metrics=CostMetrics(
            profit_loss=net_pl,
            profit_margin=margin,
            cost_per_minute=z,
        ),
        aggregation_source="monthly_rollup",
        source_record_count=len(docs),
    )
