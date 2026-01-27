"""Cost data reconciliation job."""

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.logging_config import get_logger
from app.models.cost_breakdown import CostBreakdown, UserCostBreakdown

logger = get_logger(__name__)


async def cost_reconciliation_job() -> None:
    """
    Daily cost reconciliation job.

    Verifies that system-wide costs match sum of per-user costs.
    Runs daily to catch inconsistencies from aggregation failures.
    """
    # Wait for server initialization
    await asyncio.sleep(180)

    while True:
        try:
            logger.info("Starting daily cost reconciliation")

            # Reconcile costs for the last N days
            await _reconcile_recent_costs()

            logger.info("Daily cost reconciliation completed")

        except asyncio.CancelledError:
            logger.info("Cost reconciliation job cancelled")
            break

        except Exception as e:
            logger.error(
                f"Cost reconciliation error: {e}",
                extra={"error": str(e)},
                exc_info=True,
            )

        # Run daily at 2 AM UTC
        now = datetime.utcnow()
        tomorrow_2am = (now + timedelta(days=1)).replace(
            hour=2, minute=0, second=0, microsecond=0
        )
        sleep_seconds = (tomorrow_2am - now).total_seconds()
        await asyncio.sleep(sleep_seconds)


async def _reconcile_recent_costs(days: int = 7) -> None:
    """Reconcile costs for the last N days."""
    end_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = end_date - timedelta(days=days)

    # Query daily cost breakdowns
    system_costs = await CostBreakdown.find(
        {
            "period_type": "daily",
            "period_start": {"$gte": start_date, "$lt": end_date},
            "is_finalized": True,
        }
    ).to_list()

    for day_cost in system_costs:
        # Sum all per-user costs for this day
        user_costs = await UserCostBreakdown.find(
            {
                "period_type": "daily",
                "period_start": day_cost.period_start,
                "is_finalized": True,
            }
        ).to_list()

        user_ai_total = sum(uc.ai_costs.total for uc in user_costs)

        # Allow 1% tolerance for rounding
        tolerance = day_cost.ai_costs.total * Decimal("0.01")
        diff = abs(day_cost.ai_costs.total - user_ai_total)

        if diff > tolerance:
            logger.warning(
                "Cost reconciliation mismatch",
                extra={
                    "period_start": day_cost.period_start.isoformat(),
                    "system_ai_cost": str(day_cost.ai_costs.total),
                    "user_sum_ai_cost": str(user_ai_total),
                    "difference": str(diff),
                    "tolerance": str(tolerance),
                },
            )
        else:
            logger.debug(
                "Cost reconciliation passed",
                extra={
                    "period_start": day_cost.period_start.isoformat(),
                    "ai_cost": str(day_cost.ai_costs.total),
                },
            )
