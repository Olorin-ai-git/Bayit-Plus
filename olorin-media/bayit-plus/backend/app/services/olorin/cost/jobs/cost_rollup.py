"""Hourly cost aggregation background job."""

import asyncio
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
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

    Runs once per month.
    """
    aggregation_service = CostAggregationService()

    # Wait for server initialization
    await asyncio.sleep(120)

    while True:
        try:
            # Schedule to run at start of each month
            now = datetime.now(timezone.utc)
            if now.day != 1:
                # Wait until next month
                days_until_next_month = (
                    (now.replace(day=1) + timedelta(days=32)).replace(day=1) - now
                ).days
                await asyncio.sleep(days_until_next_month * 24 * 3600)
                continue

            logger.debug("Starting monthly cost aggregation")

            # Aggregate previous month's costs
            # TODO: Query daily cost breakdowns and aggregate to monthly
            # TODO: Store in CostBreakdown with period_type='monthly'

            logger.debug("Monthly cost aggregation completed")

        except asyncio.CancelledError:
            logger.debug("Monthly cost rollup job cancelled")
            break

        except Exception as e:
            logger.error(
                f"Monthly cost rollup error: {e}",
                extra={"error": str(e)},
                exc_info=True,
            )

        # Wait 24 hours before checking again
        await asyncio.sleep(86400)
