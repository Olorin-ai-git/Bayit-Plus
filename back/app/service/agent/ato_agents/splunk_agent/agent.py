from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

from agents import Agent, function_tool

from .client import SplunkClient


class ChartType(str, Enum):
    LINE = "line"
    BAR = "bar"
    COLUMN = "column"
    PIE = "pie"
    SCATTER = "scatter"
    AREA = "area"
    BUBBLE = "bubble"


@dataclass
class SplunkContext:
    host: str
    port: int
    username: str
    password: str


class SplunkAgent(Agent[SplunkContext]):
    def __init__(
        self, host: str, port: int, username: str, password: str, model: str = "gpt-4"
    ):
        self.client = SplunkClient(host, port, username, password)
        self._connected = False

        # Define tools
        async def execute_query(query: str) -> Dict[str, Any]:
            """Execute a Splunk search query and return the results.

            Args:
                query: The Splunk search query to execute. Can be a simple search or SPL query.

            Returns:
                Dictionary containing search results.
            """
            if not self._connected:
                await self.connect()
            return await self.client.search(query)

        async def create_visualization(
            sourcetype: str,
            x_field: str,
            y_field: str,
            chart_type: ChartType,
            groupby: Optional[str],
            limit: Optional[int],
            span: Optional[str],
        ) -> Dict[str, Any]:
            """Create a visualization of Splunk data.

            Args:
                sourcetype: The sourcetype to visualize.
                x_field: Field for the x-axis.
                y_field: Field for the y-axis (can include aggregation functions).
                chart_type: Type of chart to create (line, bar, pie, etc.).
                groupby: Optional field to group results by.
                limit: Maximum number of results to include (default: 100).
                span: Optional time span for time-series data (e.g., '1h', '1d', '1w').

            Returns:
                Dictionary containing chart data and configuration.
            """
            if not self._connected:
                await self.connect()
            return await self.client.create_visualization(
                sourcetype=sourcetype,
                x_field=x_field,
                y_field=y_field,
                chart_type=chart_type,
                groupby=groupby,
                limit=limit or 100,
                span=span,
            )

        async def create_timechart(
            sourcetype: str,
            value_field: str,
            span: str,
            groupby: Optional[str],
            function: str,
            limit: Optional[int],
        ) -> Dict[str, Any]:
            """Create a time-based chart from Splunk data.

            Args:
                sourcetype: The sourcetype to analyze.
                value_field: Field to analyze over time.
                span: Time span for buckets (e.g., '1h', '1d', '1w').
                groupby: Optional field to split the data by.
                function: Aggregation function (count, avg, sum, etc.).
                limit: Maximum number of results to include (default: 100).

            Returns:
                Dictionary containing timechart data.
            """
            if not self._connected:
                await self.connect()
            return await self.client.create_timechart(
                sourcetype=sourcetype,
                value_field=value_field,
                span=span,
                groupby=groupby,
                function=function,
                limit=limit or 100,
            )

        async def get_sourcetypes() -> List[str]:
            """Get a list of available sourcetypes in the Splunk instance.

            Returns:
                List of sourcetype names.
            """
            if not self._connected:
                await self.connect()
            results = await self.client.search(
                "| metadata type=sourcetypes | table sourcetype"
            )
            return [
                result.get("sourcetype")
                for result in results.get("results", [])
                if result.get("sourcetype")
            ]

        async def get_field_summary(sourcetype: str) -> Dict[str, Any]:
            """Get a summary of fields available for a specific sourcetype.

            Args:
                sourcetype: The sourcetype to analyze.

            Returns:
                Dictionary containing field information including name, type, and frequency.
            """
            if not self._connected:
                await self.connect()
            query = f"""| metadata type=fields sourcetype="{sourcetype}" 
                    | table field, type, count, distinct_count 
                    | sort - count"""
            return await self.client.search(query)

        async def get_saved_searches() -> List[Dict[str, Any]]:
            """Get a list of saved searches in the Splunk instance.

            Returns:
                List of saved searches with their configurations.
            """
            if not self._connected:
                await self.connect()
            return await self.client.list_saved_searches()

        async def run_stats_query(
            field: str, sourcetype: str, groupby: Optional[str] = None
        ) -> Dict[str, Any]:
            """Run a statistical analysis on a field.

            Args:
                field: The field to analyze.
                sourcetype: The sourcetype to query.
                groupby: Optional field to group results by.

            Returns:
                Dictionary containing statistical results.
            """
            if not self._connected:
                await self.connect()
            stats_cmd = (
                f"stats count avg({field}) max({field}) min({field}) stdev({field})"
            )
            if groupby:
                stats_cmd += f" by {groupby}"
            query = f"""search sourcetype="{sourcetype}" | {stats_cmd}"""
            return await self.client.search(query)

        super().__init__(
            name="SplunkAgent",
            instructions="""I am a Splunk agent that can help you query and analyze Splunk data.
            I can:
            1. Execute Splunk searches and format results
            2. Get information about available sourcetypes
            3. Analyze field information and statistics
            4. List and run saved searches
            5. Perform statistical analysis on fields
            6. Create visualizations and charts
            
            For visualizations:
            - Use create_visualization() for general charts (line, bar, pie, scatter, etc.)
            - Use create_timechart() specifically for time-series data
            - Always consider the data type when choosing chart types
            - Use groupby for multi-series charts when relevant
            - Use span parameter for time-based data to control granularity
            
            When processing queries:
            1. If you need to know what data is available, use get_sourcetypes()
            2. If you need to understand the structure of data, use get_field_summary()
            3. For statistical analysis, use run_stats_query()
            4. For general searches, use execute_query()
            5. For saved searches, use get_saved_searches()
            6. For data visualization, use create_visualization() or create_timechart()
            
            Always try to provide insights about the data when relevant.""",
            model=model,
            tools=[
                function_tool(execute_query),
                function_tool(get_sourcetypes),
                function_tool(get_field_summary),
                function_tool(get_saved_searches),
                function_tool(run_stats_query),
                function_tool(create_visualization),
                function_tool(create_timechart),
            ],
        )

    async def connect(self) -> None:
        """Connect to the Splunk server."""
        try:
            await self.client.connect()
            self._connected = True
        except Exception as e:
            raise ConnectionError(f"Failed to connect to Splunk: {str(e)}")

    def format_results(self, results: Dict[str, Any]) -> str:
        """Format the Splunk search results into a readable string."""
        if not results or not results.get("results"):
            return "No results found."

        # Check if this is a visualization result
        if "chart_data" in results:
            return f"""Visualization created:
Type: {results.get('chart_type', 'Unknown')}
Data points: {len(results.get('chart_data', []))}
Configuration: {results.get('chart_config', {})}"""

        formatted = ["Search Results:"]
        for idx, result in enumerate(results["results"], 1):
            formatted.append(f"\nResult {idx}:")
            for key, value in result.items():
                formatted.append(f"  {key}: {value}")

        return "\n".join(formatted)

    async def disconnect(self) -> None:
        """Disconnect from the Splunk server."""
        if self._connected:
            await self.client.disconnect()
            self._connected = False
