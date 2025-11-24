"""Snowflake connection service with private key authentication."""
import logging
import os
from typing import Any, Dict, List, Optional
import snowflake.connector
from snowflake.connector import DictCursor
from app.config.snowflake_config import SnowflakeConfig

logger = logging.getLogger(__name__)


class SnowflakeConnectionFactory:
    """
    Factory for creating Snowflake connections with private key authentication.

    This factory supports multiple authentication methods:
    - Private key (RSA) authentication (most secure)
    - Password authentication
    - External browser (SSO)
    """

    def __init__(self, config: SnowflakeConfig):
        """
        Initialize the connection factory.

        Args:
            config: Validated SnowflakeConfig instance
        """
        self.config = config
        logger.info(
            f"Initialized Snowflake connection factory for "
            f"account={config.account}, user={config.user}, "
            f"warehouse={config.warehouse}, database={config.database}, "
            f"schema={config.snowflake_schema}, auth_method={config.auth_method}"
        )

    def create_connection(self):
        """
        Create a Snowflake connection using configured authentication.

        Returns:
            snowflake.connector.SnowflakeConnection

        Raises:
            Exception: If connection fails
        """
        conn_params = {
            "account": self.config.account,
            "user": self.config.user,
            "role": self.config.role,
            "warehouse": self.config.warehouse,
            "database": self.config.database,
            "schema": self.config.snowflake_schema,
        }

        # Add authentication based on method
        if self.config.auth_method == "private_key":
            logger.info("Using private key authentication")
            private_key = self.config.load_private_key()
            conn_params["private_key"] = private_key

        elif self.config.auth_method == "externalbrowser":
            logger.info("Using external browser (SSO) authentication")
            conn_params["authenticator"] = "externalbrowser"

        elif self.config.auth_method == "password":
            logger.info("Using password authentication")
            conn_params["password"] = self.config.password

        try:
            conn = snowflake.connector.connect(**conn_params)
            logger.info("Successfully connected to Snowflake")
            return conn

        except Exception as e:
            logger.error(f"Failed to connect to Snowflake: {e}")
            raise


class SnowflakeQueryService:
    """
    Service for executing schema-compliant queries against Snowflake.

    All queries use only columns verified against the authoritative schema
    in scripts/snowflake_setup.sql.
    """

    def __init__(self, connection_factory: SnowflakeConnectionFactory):
        """
        Initialize the query service.

        Args:
            connection_factory: Factory for creating Snowflake connections
        """
        self.connection_factory = connection_factory
        # Get table name from environment variables
        self.table_name = self._get_table_name()
    
    def _get_table_name(self) -> str:
        """Get full table name from environment variables."""
        database = os.getenv('SNOWFLAKE_DATABASE', 'DBT')
        schema = os.getenv('SNOWFLAKE_SCHEMA', 'DBT_PROD')
        table = os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TXS')
        return f"{database}.{schema}.{table}"

    def execute_query(
        self,
        query: str,
        params: Optional[tuple] = None,
        fetch_all: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Execute a SQL query and return results as list of dictionaries.

        Args:
            query: SQL query to execute
            params: Query parameters (for parameterized queries)
            fetch_all: If True, fetch all results; if False, fetch one

        Returns:
            List of dictionaries containing query results

        Raises:
            Exception: If query execution fails
        """
        conn = None
        cursor = None

        try:
            conn = self.connection_factory.create_connection()
            cursor = conn.cursor(DictCursor)

            logger.debug(f"Executing query: {query[:100]}...")

            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            if fetch_all:
                results = cursor.fetchall()
            else:
                result = cursor.fetchone()
                results = [result] if result else []

            logger.info(f"Query returned {len(results)} rows")
            return results

        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def get_transactions_by_email(
        self,
        email: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get transactions for a specific email address.

        Uses only schema-verified columns from TRANSACTIONS_ENRICHED.

        Args:
            email: Email address to query
            limit: Maximum number of transactions to return

        Returns:
            List of transaction dictionaries
        """
        query = """
        SELECT
            TX_ID_KEY,
            TX_DATETIME,
            EMAIL,
            USER_ID,
            USER_ACCOUNT_AGE_DAYS,
            PAID_AMOUNT_VALUE,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            PAID_CURRENCY,
            PAYMENT_METHOD,
            MERCHANT_NAME,
            MERCHANT_CATEGORY,
            DEVICE_ID,
            DEVICE_TYPE,
            DEVICE_OS,
            BROWSER_NAME,
            DEVICE_FINGERPRINT,
            IP,
            IP_COUNTRY,
            IP_CITY,
            IP_LATITUDE,
            IP_LONGITUDE,
            MODEL_SCORE,
            IS_FRAUD_TX,
            FRAUD_TYPE,
            TX_COUNT_1H,
            TX_COUNT_24H,
            CREATED_AT
        FROM {self.table_name}
        WHERE EMAIL = %s
        ORDER BY TX_DATETIME DESC
        LIMIT %s
        """
        return self.execute_query(query, (email, limit))

    def get_high_risk_transactions(
        self,
        risk_threshold: float = 70.0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get high-risk transactions above a risk score threshold.

        Args:
            risk_threshold: Minimum MODEL_SCORE to return
            limit: Maximum number of transactions to return

        Returns:
            List of high-risk transaction dictionaries
        """
        query = """
        SELECT
            TX_ID_KEY,
            TX_DATETIME,
            EMAIL,
            USER_ID,
            PAID_AMOUNT_VALUE_IN_CURRENCY,
            PAID_CURRENCY,
            MERCHANT_NAME,
            MODEL_SCORE,
            IS_FRAUD_TX,
            FRAUD_TYPE,
            IP_COUNTRY,
            DEVICE_TYPE
        FROM {self.table_name}
        WHERE MODEL_SCORE >= %s
        ORDER BY MODEL_SCORE DESC, TX_DATETIME DESC
        LIMIT %s
        """
        return self.execute_query(query, (risk_threshold, limit))

    def get_merchant_statistics(self) -> List[Dict[str, Any]]:
        """
        Get transaction statistics grouped by merchant.

        Returns:
            List of merchant statistics dictionaries
        """
        query = """
        SELECT
            MERCHANT_NAME,
            MERCHANT_CATEGORY,
            COUNT(*) as transaction_count,
            COUNT(DISTINCT EMAIL) as unique_users,
            AVG(PAID_AMOUNT_VALUE_IN_CURRENCY) as avg_amount,
            SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count,
            AVG(MODEL_SCORE) as avg_risk_score
        FROM {self.table_name}
        GROUP BY MERCHANT_NAME, MERCHANT_CATEGORY
        ORDER BY transaction_count DESC
        LIMIT 100
        """
        return self.execute_query(query)
