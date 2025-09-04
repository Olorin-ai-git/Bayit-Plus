import asyncio
import json
import time
from concurrent.futures import ThreadPoolExecutor
from enum import Enum
from typing import Any, Dict, List, Optional
from urllib.parse import unquote_plus

import splunklib.client as splunk
import splunklib.results as results
from app.service.logging import get_bridge_logger
logger = get_bridge_logger(__name__)



class ChartType(str, Enum):
    LINE = "line"
    BAR = "bar"
    COLUMN = "column"
    PIE = "pie"
    SCATTER = "scatter"
    AREA = "area"
    BUBBLE = "bubble"


class SplunkClient:
    def __init__(self, host: str, port: int, username: str, password: str):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.service = None
        self._executor = ThreadPoolExecutor(max_workers=1)

    async def connect(self) -> None:
        """Connect to the Splunk server asynchronously."""

        def _connect():
            self.service = splunk.connect(
                host=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
            )

        await asyncio.get_event_loop().run_in_executor(self._executor, _connect)

    async def search(
        self, query: str, time_range: str = "-365d"
    ) -> list[dict[Any, Any]]:
        """Execute a Splunk search query asynchronously."""
        if not self.service:
            raise ConnectionError("Not connected to Splunk server")

        def _search():
            try:
                # Check if query already contains earliest time constraint
                if "earliest=" in query:
                    # Don't pass separate earliest_time if it's already in the query
                    job = self.service.jobs.create(query, exec_mode="normal")
                else:
                    # Use the time_range parameter for backwards compatibility
                    job = self.service.jobs.create(
                        query, earliest_time=time_range, exec_mode="normal"
                    )

                # Wait for the job to complete with timeout
                start_time = time.time()
                timeout_seconds = 300  # 5 minute timeout
                while not job.is_done():
                    elapsed = time.time() - start_time
                    if elapsed > timeout_seconds:
                        job.cancel()
                        raise Exception(
                            f"Splunk search timed out after {timeout_seconds} seconds"
                        )
                    time.sleep(2.0)  # Poll every 2 seconds instead of 0.5

                if job["isFailed"] == "1":
                    error_msg = f"Job failed: {job.get('messages', 'No error message')}"
                    logger.error(f"Splunk job failed: {error_msg}")
                    raise Exception(error_msg)

                # Get information about results
                result_count = int(job["resultCount"])
                if result_count == 0:
                    print(
                        f"Query completed successfully but returned 0 results: {query[:100]}..."
                    )
                    return []

                logger.info(f"Query returned {result_count} results")
                raw = job.results(output_mode="json_rows", count=0).read()
                payload = json.loads(raw.decode("utf-8"))
                fields = payload["fields"]
                rows = payload["rows"]

                return [dict(zip(fields, row)) for row in rows]
            except Exception as e:
                logger.error(f"Error in Splunk query execution: {str(e)}")
                import traceback

                traceback.print_exc()
                raise

        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(self._executor, _search)
        except Exception as e:
            logger.error(f"Error executing Splunk query: {str(e)}")
            # Return empty list instead of failing
            return []

    async def list_saved_searches(self) -> List[Dict[str, Any]]:
        """Get a list of saved searches asynchronously."""
        if not self.service:
            raise ConnectionError("Not connected to Splunk server")

        def _list_saved_searches():
            saved_searches = []
            for saved_search in self.service.saved_searches:
                search_info = {
                    "name": saved_search.name,
                    "search": saved_search.content.get("search", ""),
                    "description": saved_search.content.get("description", ""),
                    "schedule": saved_search.content.get("cron_schedule", ""),
                    "disabled": saved_search.content.get("disabled", False),
                }
                saved_searches.append(search_info)
            return saved_searches

        return await asyncio.get_event_loop().run_in_executor(
            self._executor, _list_saved_searches
        )

    async def get_sourcetypes(self) -> List[str]:
        """Get a list of available sourcetypes asynchronously."""
        results = await self.search("| metadata type=sourcetypes | table sourcetype")
        if not isinstance(results, dict):
            return []
        return [
            result.get("sourcetype")
            for result in results.get("results", [])
            if result.get("sourcetype")
        ]

    async def get_field_summary(self, sourcetype: str) -> Dict[str, Any]:
        """Get a summary of fields for a specific sourcetype asynchronously."""
        query = f"""| metadata type=fields sourcetype="{sourcetype}" 
                | table field, type, count, distinct_count 
                | sort - count"""
        return await self.search(query)

    async def run_stats_query(
        self, field: str, sourcetype: str, groupby: Optional[str] = None
    ) -> Dict[str, Any]:
        """Run a statistical analysis on a field asynchronously."""
        stats_cmd = f"stats count avg({field}) max({field}) min({field}) stdev({field})"
        if groupby:
            stats_cmd += f" by {groupby}"
        query = f"""search sourcetype="{sourcetype}" | {stats_cmd}"""
        return await self.search(query)

    async def disconnect(self) -> None:
        """Disconnect from the Splunk server asynchronously."""

        def _disconnect():
            if self.service:
                self.service = None

        await asyncio.get_event_loop().run_in_executor(self._executor, _disconnect)

    def __del__(self):
        """Cleanup when the object is destroyed."""
        if getattr(self, "_executor", None) is not None:
            self._executor.shutdown(wait=False)

    def run_query(self, query: str) -> List[Dict[str, str]]:
        """Execute a Splunk search query and return formatted results."""
        if not self.service:
            raise ConnectionError("Not connected to Splunk. Call connect() first.")

        try:
            # Create a search job
            job = self.service.jobs.create(query, earliest_time="-10d")

            # Wait for the job to complete with timeout
            start_time = time.time()
            timeout_seconds = 300  # 5 minute timeout
            while not job.is_done():
                elapsed = time.time() - start_time
                if elapsed > timeout_seconds:
                    job.cancel()
                    raise Exception(
                        f"Splunk search timed out after {timeout_seconds} seconds"
                    )
                time.sleep(2.0)  # Poll every 2 seconds instead of 0.5

            # Get the results
            results_response = results.ResultsReader(job.results())

            # Format the results
            formatted_results = []
            for result in results_response:
                if isinstance(result, dict):
                    # Create a simplified version of the result
                    simplified = {
                        "time": result.get("_time", ""),
                        "source": result.get("source", ""),
                        "sourcetype": result.get("sourcetype", ""),
                        "host": result.get("host", ""),
                        "raw": result.get("_raw", ""),
                    }
                    formatted_results.append(simplified)

            return formatted_results
        except Exception as e:
            raise Exception(f"Error executing Splunk query: {str(e)}")

    def is_connected(self) -> bool:
        """Check if client is connected to Splunk."""
        return self.service is not None

    async def create_visualization(
        self,
        sourcetype: str,
        x_field: str,
        y_field: str,
        chart_type: ChartType,
        groupby: Optional[str] = None,
        limit: int = 100,
        span: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a visualization from Splunk data."""
        if not self.service:
            raise ConnectionError("Not connected to Splunk server")

        # Build the base query
        query = f'search sourcetype="{sourcetype}"'

        # Add time span if provided
        if span:
            query += f" | bucket _time span={span}"

        # Build the chart command based on chart type
        chart_cmd = ""
        if chart_type in [ChartType.LINE, ChartType.AREA]:
            chart_cmd = "timechart" if "_time" in [x_field, y_field] else "chart"
        elif chart_type == ChartType.PIE:
            chart_cmd = "chart"
        elif chart_type in [ChartType.BAR, ChartType.COLUMN]:
            chart_cmd = "chart"
        elif chart_type == ChartType.SCATTER:
            chart_cmd = "chart"
        elif chart_type == ChartType.BUBBLE:
            chart_cmd = "chart"

        # Add groupby if provided
        if groupby:
            query += f" | {chart_cmd} by {groupby}"
        else:
            query += f" | {chart_cmd}"

        # Add fields
        query += f" {y_field} by {x_field}"

        # Add limit
        query += f" | head {limit}"

        # Execute the search
        results = await self.search(query)

        # Format the results for visualization
        return {
            "chart_type": chart_type,
            "chart_data": results.get("results", []),
            "chart_config": {
                "x_field": x_field,
                "y_field": y_field,
                "groupby": groupby,
                "span": span,
                "limit": limit,
            },
        }

    async def create_timechart(
        self,
        sourcetype: str,
        value_field: str,
        span: str = "1h",
        groupby: Optional[str] = None,
        function: str = "count",
        limit: int = 100,
    ) -> Dict[str, Any]:
        """Create a time-based chart from Splunk data."""
        if not self.service:
            raise ConnectionError("Not connected to Splunk server")

        # Build the query
        query = f'search sourcetype="{sourcetype}"'

        # Add the timechart command
        if groupby:
            query += f" | timechart span={span} {function}({value_field}) by {groupby}"
        else:
            query += f" | timechart span={span} {function}({value_field})"

        # Add limit
        query += f" | head {limit}"

        # Execute the search
        results = await self.search(query)

        # Format the results for visualization
        return {
            "chart_type": "timechart",
            "chart_data": results.get("results", []),
            "chart_config": {
                "value_field": value_field,
                "span": span,
                "groupby": groupby,
                "function": function,
                "limit": limit,
            },
        }
