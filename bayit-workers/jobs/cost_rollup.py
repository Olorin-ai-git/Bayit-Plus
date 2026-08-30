"""
Cloud Run Job: Hourly cost aggregation.

Run-once job triggered by Cloud Scheduler. Aggregates costs from
the previous hour into system-wide and per-user cost breakdowns.

Usage: python -m jobs.cost_rollup
"""

import asyncio
import logging

from app.core.ai_clients import close_ai_clients
from app.core.database import close_mongo_connection, connect_to_mongo_subset
from app.core.logging_config import setup_logging
from app.models.cost_breakdown import CostBreakdown, UserCostBreakdown
from app.models.user import User

setup_logging()
logger = logging.getLogger(__name__)

JOB_MODELS = [CostBreakdown, UserCostBreakdown, User]


async def run() -> None:
    """Execute a single hourly cost aggregation pass."""
    await connect_to_mongo_subset(document_models=JOB_MODELS)
    try:
        from app.services.olorin.cost.aggregation import CostAggregationService
        aggregation_service = CostAggregationService()
        cost_breakdown = await aggregation_service.aggregate_hourly_costs()
        logger.info(
            "Cost aggregation complete",
            extra={
                "period_start": cost_breakdown.period_start.isoformat(),
                "period_end": cost_breakdown.period_end.isoformat(),
                "total_cost": str(cost_breakdown.totals.platform_cost),
            },
        )
    finally:
        await close_ai_clients()
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(run())
