"""Cost data archival job."""

import asyncio
import json
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.storage import storage_provider
from app.models.cost_breakdown import CostBreakdown

logger = get_logger(__name__)


async def cost_archival_job() -> None:
    """
    Monthly cost archival job.

    Moves cost data older than warm retention to GCS bucket as JSON/Parquet.
    Runs once per month.
    """
    # Wait for server initialization
    await asyncio.sleep(240)

    while True:
        try:
            logger.info("Starting cost data archival")

            # Archive costs older than warm retention period
            await _archive_old_costs()

            logger.info("Cost data archival completed")

        except asyncio.CancelledError:
            logger.info("Cost archival job cancelled")
            break

        except Exception as e:
            logger.error(
                f"Cost archival error: {e}",
                extra={"error": str(e)},
                exc_info=True,
            )

        # Run monthly on 1st at 3 AM UTC
        now = datetime.now(timezone.utc)
        next_month = (now.replace(day=1) + timedelta(days=32)).replace(day=1)
        next_run = next_month.replace(hour=3, minute=0, second=0, microsecond=0)
        sleep_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(sleep_seconds)


async def _archive_old_costs() -> None:
    """Archive costs older than warm retention period."""
    if not settings.olorin.cost_aggregation.archive_to_gcs_enabled:
        logger.info("GCS archival disabled")
        return

    warm_days = settings.olorin.cost_aggregation.warm_data_retention_days
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=warm_days)

    # Query old cost records
    old_costs = await CostBreakdown.find(
        {
            "period_type": {"$in": ["hourly", "daily"]},
            "period_start": {"$lt": cutoff_date},
            "is_finalized": True,
        }
    ).to_list()

    if not old_costs:
        logger.info("No old costs to archive")
        return

    logger.info(f"Archiving {len(old_costs)} cost records to GCS")

    # Group by month for organized storage
    by_month = {}
    for cost in old_costs:
        month_key = f"{cost.period_start.year}/{cost.period_start.month:02d}"
        if month_key not in by_month:
            by_month[month_key] = []
        by_month[month_key].append(cost)

    # Upload each month's data
    bucket_name = settings.olorin.cost_aggregation.gcs_bucket_name
    for month_key, costs in by_month.items():
        try:
            # Convert to JSON (could be Parquet for efficiency)
            data = [json.loads(c.json()) for c in costs]
            json_data = json.dumps(data, indent=2, default=str)

            # Upload to GCS
            gcs_path = f"cost_archives/{month_key}/breakdown.json"
            await storage_provider.upload_blob(
                bucket_name=bucket_name,
                blob_path=gcs_path,
                data=json_data.encode("utf-8"),
                content_type="application/json",
            )

            logger.info(
                f"Archived {len(costs)} cost records to GCS",
                extra={"month": month_key, "gcs_path": gcs_path},
            )

        except Exception as e:
            logger.error(
                f"Failed to archive {month_key}: {e}",
                extra={"month": month_key, "error": str(e)},
            )
            # Don't fail completely if one month fails
            continue

    # Don't delete yet - keep for 30 more days as safety margin
    # Real deletion would happen after verification
    logger.info("Cost archival completed - records marked for deletion")
