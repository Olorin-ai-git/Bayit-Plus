"""
Snowflake database client for secure query execution.
Handles connection, query validation, and result processing.
"""

import asyncio
import os
from typing import Any, Dict, List, Optional

from .schema_constants import (
    EMAIL,
    IS_FRAUD_TX,
    MAXMIND_RISK_SCORE,
    MODEL_SCORE,
    NSURE_LAST_DECISION,
    PAID_AMOUNT_VALUE_IN_CURRENCY,
    PAYMENT_METHOD,
    TX_DATETIME,
    TX_ID_KEY,
    get_full_table_name,
    get_required_env_var,
)


# Common query templates using schema constants
def _get_common_queries():
    """Get common query templates with dynamically resolved table names."""
    return {
        "fraud_transactions": f"""
            SELECT {TX_ID_KEY}, {EMAIL}, {NSURE_LAST_DECISION}, {MODEL_SCORE}, {IS_FRAUD_TX},
                   {TX_DATETIME}, {PAID_AMOUNT_VALUE_IN_CURRENCY}
            FROM {get_full_table_name()}
            WHERE {IS_FRAUD_TX} = 1
            ORDER BY {TX_DATETIME} DESC
        """,
        "high_risk_scores": f"""
            SELECT {TX_ID_KEY}, {EMAIL}, {MODEL_SCORE}, {MAXMIND_RISK_SCORE},
                   {NSURE_LAST_DECISION}, {TX_DATETIME}, {PAID_AMOUNT_VALUE_IN_CURRENCY}
            FROM {get_full_table_name()}
            WHERE {MODEL_SCORE} > 0.8 OR {MAXMIND_RISK_SCORE} > 80
            ORDER BY {MODEL_SCORE} DESC, {MAXMIND_RISK_SCORE} DESC
        """,
    }


from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Determine which client to use based on environment
USE_REAL_SNOWFLAKE = os.getenv("USE_SNOWFLAKE", "false").lower() == "true"
TEST_MODE = os.getenv("TEST_MODE", "").lower() == "demo"

# Force mock mode if TEST_MODE is set
if TEST_MODE:
    USE_REAL_SNOWFLAKE = False
    logger.info("Using MOCK Snowflake client (TEST_MODE=mock)")
elif USE_REAL_SNOWFLAKE:
    try:
        from .real_client import RealSnowflakeClient

        logger.info("Using REAL Snowflake client (USE_SNOWFLAKE=true)")
    except ImportError as e:
        logger.warning(f"Failed to import RealSnowflakeClient: {e}")
        logger.warning(
            "Falling back to mock client. Install snowflake-connector-python to use real client."
        )
        USE_REAL_SNOWFLAKE = False


class SnowflakeClient:
    """Client for interacting with Snowflake data warehouse."""

    def __init__(
        self,
        account: str = None,
        user: str = None,
        password: str = None,
        warehouse: str = None,
    ):
        # If real Snowflake is enabled, delegate to real client
        if USE_REAL_SNOWFLAKE:
            # Import only when needed to avoid configuration loading
            from .real_client import RealSnowflakeClient

            self._real_client = RealSnowflakeClient()
            self.is_real = True
        else:
            # Mock client attributes
            self.account = account or "mock_account"
            self.user = user or "mock_user"
            self.password = password or "mock_password"
            self.warehouse = warehouse or "mock_warehouse"
            self.connection = None
            self.is_real = False

    async def connect(self, database: str = None, schema: str = "PUBLIC"):
        """Establish connection to Snowflake."""
        if self.is_real:
            return await self._real_client.connect(database, schema)
        else:
            # Mock connection - use environment variable for database if not provided
            self.database = database or get_required_env_var("SNOWFLAKE_DATABASE")
            self.schema = schema
            await asyncio.sleep(0.1)  # Simulate connection
            logger.info(
                f"Mock connected to Snowflake: {self.account}/{self.database}.{self.schema}"
            )

    async def disconnect(self):
        """Close Snowflake connection."""
        if self.is_real:
            return await self._real_client.disconnect()
        else:
            # Mock disconnect
            await asyncio.sleep(0.1)
            logger.info("Mock disconnected from Snowflake")

    def validate_query(self, query: str, limit: Optional[int] = None) -> str:
        """Validate and enhance SQL query for safety and performance."""
        if self.is_real:
            return self._real_client.validate_query(query, limit)
        else:
            # Mock validation
            query = query.strip()
            query_upper = query.upper()

            # Only allow SELECT and WITH (CTE) statements for security
            if not (query_upper.startswith("SELECT") or query_upper.startswith("WITH")):
                raise ValueError(
                    "Only SELECT queries and CTEs (WITH) are allowed for security reasons"
                )

            # Check for dangerous keywords
            dangerous_keywords = [
                "DELETE",
                "DROP",
                "INSERT",
                "UPDATE",
                "CREATE",
                "ALTER",
                "TRUNCATE",
            ]
            for keyword in dangerous_keywords:
                if keyword in query_upper:
                    raise ValueError(f"Query contains restricted keyword: {keyword}")

            # Add LIMIT if not present and limit is specified
            if limit and "LIMIT" not in query_upper:
                query = f"{query.rstrip(';')} LIMIT {min(limit, 10000)}"

            # Ensure main table reference uses environment configuration
            table_name = get_full_table_name()
            if "TRANSACTIONS_ENRICHED" in query_upper and table_name not in query_upper:
                # Only replace if it's just TRANSACTIONS_ENRICHED without schema prefix
                query = query.replace("TRANSACTIONS_ENRICHED", table_name)

            return query

    def get_common_query(self, query_type: str, **params) -> str:
        """Get a pre-defined common query with parameters."""
        common_queries = _get_common_queries()
        if query_type not in common_queries:
            available = ", ".join(common_queries.keys())
            raise ValueError(f"Unknown query type. Available: {available}")

        query = common_queries[query_type]

        # Replace parameters in query
        for key, value in params.items():
            placeholder = f"{{{key}}}"
            if placeholder in query:
                query = query.replace(placeholder, str(value))

        return query.format(**params) if params else query

    async def execute_query(
        self, query: str, limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Execute a SQL query against Snowflake."""
        if self.is_real:
            return await self._real_client.execute_query(query, limit)
        else:
            # Mock execution using real captured data
            safe_query = self.validate_query(query, limit)

            logger.info(
                f"Mock executing query in {self.database}.{self.schema}: {safe_query[:100]}..."
            )

            # Simulate query time
            await asyncio.sleep(0.5)

            # Load mock data from JSON file
            import json
            import os

            mock_data_file = os.path.join(
                os.path.dirname(__file__), "mock_snowflake_data.json"
            )

            try:
                with open(mock_data_file, "r") as f:
                    mock_data = json.load(f)
            except FileNotFoundError:
                logger.warning(f"Mock data file not found: {mock_data_file}")
                mock_data = {}

            # Return mock data structure matching schema
            mock_results = []
            query_lower = safe_query.lower()

            # Check for risk entity queries (CTEs)
            if "risk_calculations" in query_lower and (
                "ip" in query_lower or "group by ip" in query_lower
            ):
                # Return mock high-risk IP addresses from real data
                mock_results = mock_data.get("risk_entity_results", {}).get(
                    "ip_address_results", []
                )
            elif "risk_calculations" in query_lower and (
                "email" in query_lower or "group by email" in query_lower
            ):
                # Return mock high-risk emails from real data
                mock_results = mock_data.get("risk_entity_results", {}).get(
                    "email_results", []
                )
            elif "where ip" in query_lower or "where ip=" in query_lower:
                # Entity-specific IP query - return transaction data for that IP
                mock_results = mock_data.get("entity_queries", {}).get(
                    "default_ip_results", []
                )
            elif "where email" in query_lower:
                # Entity-specific email query - return transaction data for that email
                mock_results = mock_data.get("entity_queries", {}).get(
                    "default_email_results", []
                )
            elif "count(" in query_lower:
                mock_results = mock_data.get("aggregation_results", {}).get(
                    "count_results", [{"COUNT": 1250}]
                )
            elif "sum(" in query_lower:
                mock_results = mock_data.get("aggregation_results", {}).get(
                    "sum_results", [{"TOTAL": 1250000.00}]
                )
            elif "avg(" in query_lower:
                mock_results = mock_data.get("aggregation_results", {}).get(
                    "avg_results", [{"AVERAGE": 0.6543}]
                )
            elif "select * from" in query_lower:
                # Generic SELECT * query - return some default transaction data
                mock_results = mock_data.get("entity_queries", {}).get(
                    "default_ip_results", []
                )[: limit if limit else 100]

            logger.info(
                f"Mock query executed successfully, returned {len(mock_results)} rows"
            )
            return mock_results
