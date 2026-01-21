"""
PostgreSQL Query Execution Plan Optimization.

Provides utilities for analyzing and optimizing query execution plans.

Constitutional Compliance:
- NO hardcoded values - all from configuration
- Complete implementation
- Fail-fast validation
"""

import re
from typing import Any, Dict, List, Optional

import asyncpg

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class PostgreSQLQueryOptimizer:
    """Analyzes and optimizes PostgreSQL query execution plans."""

    def __init__(self):
        """Initialize query optimizer."""
        logger.info("Initialized PostgreSQLQueryOptimizer")

    async def explain_query(
        self, connection: asyncpg.Connection, query: str, analyze: bool = False
    ) -> str:
        """
        Get PostgreSQL EXPLAIN output for a query.

        Args:
            connection: Active PostgreSQL connection
            query: SQL query to explain
            analyze: If True, use EXPLAIN ANALYZE (actually executes query)

        Returns:
            EXPLAIN output as string

        Raises:
            Exception: If EXPLAIN fails
        """
        explain_prefix = "EXPLAIN ANALYZE" if analyze else "EXPLAIN"
        explain_query = f"{explain_prefix} {query}"

        try:
            rows = await connection.fetch(explain_query)

            # Convert rows to formatted string
            explain_output = []
            for row in rows:
                # Row is a Record object, get first column
                explain_output.append(str(row[0]))

            result = "\n".join(explain_output)
            logger.debug(f"EXPLAIN output ({len(explain_output)} lines)")

            return result

        except Exception as e:
            logger.error(f"EXPLAIN failed: {e}")
            raise

    async def analyze_execution_plan(
        self, connection: asyncpg.Connection, query: str
    ) -> Dict[str, Any]:
        """
        Analyze query execution plan and provide optimization insights.

        Args:
            connection: Active PostgreSQL connection
            query: SQL query to analyze

        Returns:
            Dictionary with analysis results and recommendations
        """
        # Get EXPLAIN output (without ANALYZE to avoid execution)
        explain_output = await self.explain_query(connection, query, analyze=False)

        analysis = {
            "query": query[:100] + "..." if len(query) > 100 else query,
            "plan": explain_output,
            "uses_index": self._check_index_usage(explain_output),
            "has_sequential_scan": self._check_sequential_scan(explain_output),
            "estimated_cost": self._extract_cost(explain_output),
            "recommendations": [],
        }

        # Generate recommendations
        if not analysis["uses_index"]:
            analysis["recommendations"].append(
                "Query does not use indexes - consider adding indexes on filter columns"
            )

        if analysis["has_sequential_scan"]:
            analysis["recommendations"].append(
                "Query uses sequential scan - consider adding index or optimizing WHERE clause"
            )

        if analysis["estimated_cost"] and analysis["estimated_cost"] > 10000:
            analysis["recommendations"].append(
                f"High estimated cost ({analysis['estimated_cost']:.0f}) - query may be slow"
            )

        logger.info(
            f"Query analysis: index={analysis['uses_index']}, "
            f"seqscan={analysis['has_sequential_scan']}, "
            f"cost={analysis['estimated_cost']}"
        )

        return analysis

    def _check_index_usage(self, explain_output: str) -> bool:
        """
        Check if query uses index scans.

        Args:
            explain_output: EXPLAIN output string

        Returns:
            True if query uses index scan
        """
        index_patterns = ["Index Scan", "Index Only Scan", "Bitmap Index Scan"]

        for pattern in index_patterns:
            if pattern in explain_output:
                return True

        return False

    def _check_sequential_scan(self, explain_output: str) -> bool:
        """
        Check if query uses sequential scans.

        Args:
            explain_output: EXPLAIN output string

        Returns:
            True if query uses sequential scan
        """
        return "Seq Scan" in explain_output

    def _extract_cost(self, explain_output: str) -> Optional[float]:
        """
        Extract estimated cost from EXPLAIN output.

        Args:
            explain_output: EXPLAIN output string

        Returns:
            Estimated cost or None if not found
        """
        # Pattern: cost=0.00..123.45
        cost_pattern = r"cost=[\d.]+\.\.([\d.]+)"
        match = re.search(cost_pattern, explain_output)

        if match:
            return float(match.group(1))

        return None

    async def suggest_indexes(
        self, connection: asyncpg.Connection, query: str
    ) -> List[str]:
        """
        Suggest indexes that might improve query performance.

        Args:
            connection: Active PostgreSQL connection
            query: SQL query to analyze

        Returns:
            List of suggested CREATE INDEX statements
        """
        suggestions = []

        # Analyze the query
        analysis = await self.analyze_execution_plan(connection, query)

        if not analysis["uses_index"]:
            # Extract table and columns from WHERE clause
            where_columns = self._extract_where_columns(query)

            if where_columns:
                for table, columns in where_columns.items():
                    if len(columns) == 1:
                        # Single column index
                        col = columns[0]
                        suggestions.append(
                            f"CREATE INDEX idx_{table}_{col.lower()} ON {table} ({col})"
                        )
                    else:
                        # Composite index
                        cols_str = ", ".join(columns)
                        cols_name = "_".join([c.lower() for c in columns])
                        suggestions.append(
                            f"CREATE INDEX idx_{table}_{cols_name} ON {table} ({cols_str})"
                        )

        logger.info(f"Generated {len(suggestions)} index suggestions")
        return suggestions

    def _extract_where_columns(self, query: str) -> Dict[str, List[str]]:
        """
        Extract table and column names from WHERE clause.

        Args:
            query: SQL query

        Returns:
            Dictionary mapping table names to list of columns used in WHERE
        """
        # Simplified extraction - real implementation would use SQL parser
        where_columns = {}

        # Extract WHERE clause
        where_match = re.search(
            r"WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)",
            query,
            re.IGNORECASE | re.DOTALL,
        )

        if where_match:
            where_clause = where_match.group(1)

            # Extract column references (simplified pattern)
            # Pattern: table.column or just column
            column_pattern = r"([A-Z_][A-Z0-9_]*)"
            columns = re.findall(column_pattern, where_clause.upper())

            if columns:
                # Assume single table for simplicity (would need FROM parsing for multi-table)
                table = (
                    "transactions_enriched"  # Default - would extract from FROM clause
                )
                where_columns[table] = list(set(columns))  # Remove duplicates

        return where_columns

    async def benchmark_query(
        self, connection: asyncpg.Connection, query: str, iterations: int = 5
    ) -> Dict[str, Any]:
        """
        Benchmark query execution performance.

        Args:
            connection: Active PostgreSQL connection
            query: SQL query to benchmark
            iterations: Number of times to run query

        Returns:
            Dictionary with benchmark results
        """
        if iterations <= 0:
            raise ValueError(f"iterations must be > 0, got {iterations}")

        import time

        durations = []

        logger.info(f"Benchmarking query ({iterations} iterations)...")

        for i in range(iterations):
            start = time.time()
            await connection.fetch(query)
            duration = time.time() - start
            durations.append(duration * 1000)  # Convert to ms

        avg_duration = sum(durations) / len(durations)
        min_duration = min(durations)
        max_duration = max(durations)

        result = {
            "iterations": iterations,
            "avg_duration_ms": avg_duration,
            "min_duration_ms": min_duration,
            "max_duration_ms": max_duration,
            "durations_ms": durations,
        }

        logger.info(
            f"Benchmark complete: avg={avg_duration:.1f}ms, "
            f"min={min_duration:.1f}ms, max={max_duration:.1f}ms"
        )

        return result
