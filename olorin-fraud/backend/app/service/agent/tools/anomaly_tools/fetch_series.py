"""
Fetch Series Tool for LangGraph Agents

Tool for fetching time series data from Snowflake for anomaly detection.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.service.anomaly.data.windows import fetch_windows_snowflake
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class _FetchSeriesArgs(BaseModel):
    """Arguments for fetch_series tool."""

    cohort: Dict[str, str] = Field(
        ...,
        description="Cohort dimensions (e.g., {'merchant_id': 'm_01', 'channel': 'web'})",
    )
    metric: str = Field(
        ..., description="Metric name (e.g., 'decline_rate', 'tx_count')"
    )
    window_from: str = Field(..., description="Start of time window (ISO format)")
    window_to: str = Field(..., description="End of time window (ISO format)")


class FetchSeriesTool(BaseTool):
    """
    Tool for fetching time series data from Snowflake.

    Retrieves transaction window data for a specific cohort and metric
    over a time window for anomaly detection analysis.
    """

    name: str = "fetch_series"
    description: str = (
        "Fetch time series data from Snowflake for a cohort and metric. "
        "Returns windowed data points with timestamps and values. "
        "Used for anomaly detection analysis."
    )
    args_schema: type[BaseModel] = _FetchSeriesArgs

    def _run(
        self,
        cohort: Dict[str, str],
        metric: str,
        window_from: str,
        window_to: str,
    ) -> Dict[str, Any]:
        """Execute the fetch_series tool."""
        try:
            window_from_dt = datetime.fromisoformat(window_from.replace("Z", "+00:00"))
            window_to_dt = datetime.fromisoformat(window_to.replace("Z", "+00:00"))

            # Note: fetch_windows_snowflake is async, but BaseTool._run is sync
            # Use a new event loop in a separate thread to avoid conflicts
            import asyncio
            import concurrent.futures

            def run_async_fetch():
                # Create a new event loop in this thread
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    return new_loop.run_until_complete(
                        fetch_windows_snowflake(
                            window_from=window_from_dt,
                            window_to=window_to_dt,
                            cohort_by=list(cohort.keys()),
                            metrics=[metric],
                            cohort_filters=cohort,
                        )
                    )
                finally:
                    new_loop.close()

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async_fetch)
                df = future.result()

            # Convert to list of dicts
            series = []
            for _, row in df.iterrows():
                series.append(
                    {
                        "timestamp": row["window_start"].isoformat(),
                        "value": float(row[metric]),
                    }
                )

            return {
                "series": series,
                "cohort": cohort,
                "metric": metric,
                "count": len(series),
            }

        except Exception as e:
            logger.error(f"Fetch series tool error: {e}", exc_info=True)
            return {"error": str(e), "series": [], "cohort": cohort, "metric": metric}
