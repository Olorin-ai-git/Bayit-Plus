from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from agents import Agent, function_tool

from .client import MySQLClient, TableInfo


@dataclass
class MySQLContext:
    host: str
    port: int
    username: str
    password: str
    database: str


class MySQLAgent(Agent[MySQLContext]):
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        database: str,
        model: str = "gpt-4",
    ):
        self.client = MySQLClient(host, port, username, password, database)
        self._connected = False

        # Define tools
        async def execute_query(
            query: str, params: Optional[tuple] = None
        ) -> Dict[str, Any]:
            """Execute a MySQL query and return the results.

            Args:
                query: The SQL query to execute.
                params: Optional tuple of parameters for the query.

            Returns:
                Dictionary containing query results or affected rows information.
            """
            if not self._connected:
                await self.connect()
            return await self.client.execute_query(query, params)

        async def get_tables() -> List[TableInfo]:
            """Get information about all tables in the database.

            Returns:
                List of TableInfo objects containing table name, columns, and row count.
            """
            if not self._connected:
                await self.connect()
            return await self.client.get_tables()

        async def analyze_table(table_name: str) -> Dict[str, Any]:
            """Get detailed analysis of a table including column statistics.

            Args:
                table_name: Name of the table to analyze.

            Returns:
                Dictionary containing table analysis including column statistics.
            """
            if not self._connected:
                await self.connect()
            return await self.client.analyze_table(table_name)

        async def get_table_relationships() -> List[Dict[str, Any]]:
            """Get foreign key relationships between tables.

            Returns:
                List of dictionaries describing table relationships.
            """
            if not self._connected:
                await self.connect()
            return await self.client.get_table_relationships()

        super().__init__(
            name="MySQLAgent",
            instructions="""I am a MySQL agent that can help you query and analyze databases.
            I can:
            1. Execute SQL queries and format results
            2. Get information about available tables and their structure
            3. Analyze table statistics and relationships
            4. Provide insights about data distribution and relationships
            
            When processing queries:
            1. If you need to know what tables are available, use get_tables()
            2. If you need to understand a table's structure and statistics, use analyze_table()
            3. If you need to understand relationships between tables, use get_table_relationships()
            4. For general queries, use execute_query()
            
            Always try to:
            - Use parameterized queries when dealing with user input
            - Provide insights about the data when relevant
            - Format results in a readable way
            - Consider performance implications of queries
            - Explain any potential issues or limitations""",
            model=model,
            tools=[
                function_tool(execute_query),
                function_tool(get_tables),
                function_tool(analyze_table),
                function_tool(get_table_relationships),
            ],
        )

    async def connect(self) -> None:
        """Connect to the MySQL server."""
        try:
            await self.client.connect()
            self._connected = True
        except Exception as e:
            raise ConnectionError(f"Failed to connect to MySQL: {str(e)}")

    def format_results(self, results: Dict[str, Any]) -> str:
        """Format the MySQL query results into a readable string."""
        if not results:
            return "No results found."

        # Handle SELECT query results
        if "results" in results:
            if not results["results"]:
                return "Query executed successfully, but no rows were returned."

            formatted = ["Query Results:"]
            formatted.append(f"\nColumns: {', '.join(results['columns'])}")
            formatted.append(f"Row count: {results['row_count']}\n")

            for idx, row in enumerate(results["results"], 1):
                formatted.append(f"\nRow {idx}:")
                for key, value in row.items():
                    formatted.append(f"  {key}: {value}")

            return "\n".join(formatted)

        # Handle INSERT/UPDATE/DELETE results
        if "affected_rows" in results:
            msg = f"Query executed successfully. Affected rows: {results['affected_rows']}"
            if results.get("last_insert_id"):
                msg += f"\nLast insert ID: {results['last_insert_id']}"
            return msg

        # Handle table analysis results
        if "statistics" in results:
            formatted = [f"Analysis of table '{results['table_name']}':"]
            for stat in results["statistics"]:
                formatted.append(f"\nColumn: {stat['column']} ({stat['type']})")
                if stat.get("stats"):
                    for key, value in stat["stats"].items():
                        formatted.append(f"  {key}: {value}")
            return "\n".join(formatted)

        return str(results)

    async def disconnect(self) -> None:
        """Disconnect from the MySQL server."""
        if self._connected:
            await self.client.disconnect()
            self._connected = False
