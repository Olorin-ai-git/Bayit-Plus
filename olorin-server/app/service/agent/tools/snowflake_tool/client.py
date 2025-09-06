"""
Snowflake database client for secure query execution.
Handles connection, query validation, and result processing.
"""

import os
from typing import Any, Dict, List, Optional
import asyncio
from .schema_info import SNOWFLAKE_SCHEMA_INFO
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

# Determine which client to use based on environment
USE_REAL_SNOWFLAKE = os.getenv('USE_SNOWFLAKE', 'false').lower() == 'true'

if USE_REAL_SNOWFLAKE:
    try:
        from .real_client import RealSnowflakeClient
        logger.info("Using REAL Snowflake client (USE_SNOWFLAKE=true)")
    except ImportError as e:
        logger.warning(f"Failed to import RealSnowflakeClient: {e}")
        logger.warning("Falling back to mock client. Install snowflake-connector-python to use real client.")
        USE_REAL_SNOWFLAKE = False


class SnowflakeClient:
    """Client for interacting with Snowflake data warehouse."""
    
    def __init__(self, account: str = None, user: str = None, password: str = None, warehouse: str = None):
        # If real Snowflake is enabled, delegate to real client
        if USE_REAL_SNOWFLAKE:
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
        
    async def connect(self, database: str = "FRAUD_DB", schema: str = "PUBLIC"):
        """Establish connection to Snowflake."""
        await asyncio.sleep(0.1)  # Simulate connection
        logger.info(f"Connected to Snowflake: {self.account}/{database}.{schema}")
        self.database = database
        self.schema = schema
        
    async def disconnect(self):
        """Close Snowflake connection."""
        await asyncio.sleep(0.1)
        logger.info("Disconnected from Snowflake")
        
    def validate_query(self, query: str, limit: Optional[int] = None) -> str:
        """Validate and enhance SQL query for safety and performance."""
        query = query.strip()
        query_upper = query.upper()
        
        # Only allow SELECT statements for security
        if not query_upper.startswith('SELECT'):
            raise ValueError("Only SELECT queries are allowed for security reasons")
        
        # Check for dangerous keywords
        dangerous_keywords = ['DELETE', 'DROP', 'INSERT', 'UPDATE', 'CREATE', 'ALTER', 'TRUNCATE']
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                raise ValueError(f"Query contains restricted keyword: {keyword}")
        
        # Add LIMIT if not present and limit is specified
        if limit and 'LIMIT' not in query_upper:
            query = f"{query.rstrip(';')} LIMIT {min(limit, 10000)}"
        
        # Ensure main table reference includes full schema
        if 'TRANSACTIONS_ENRICHED' in query_upper and f'{self.database}.{self.schema}.' not in query_upper:
            query = query.replace('TRANSACTIONS_ENRICHED', f'{self.database}.{self.schema}.TRANSACTIONS_ENRICHED')
        
        return query
        
    def get_common_query(self, query_type: str, **params) -> str:
        """Get a pre-defined common query with parameters."""
        if query_type not in SNOWFLAKE_SCHEMA_INFO['common_queries']:
            available = ', '.join(SNOWFLAKE_SCHEMA_INFO['common_queries'].keys())
            raise ValueError(f"Unknown query type. Available: {available}")
        
        query = SNOWFLAKE_SCHEMA_INFO['common_queries'][query_type]
        
        # Replace parameters in query
        for key, value in params.items():
            placeholder = f'{{{key}}}'
            if placeholder in query:
                query = query.replace(placeholder, str(value))
        
        return query.format(**params) if params else query
        
    async def execute_query(self, query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Execute a SQL query against Snowflake."""
        safe_query = self.validate_query(query, limit)
        
        logger.info(f"Executing query in {self.database}.{self.schema}: {safe_query[:100]}...")
        
        # In production, this would use snowflake-connector-python
        await asyncio.sleep(0.5)
        
        # Return mock data structure matching schema
        mock_results = []
        query_lower = safe_query.lower()
        
        if 'count(' in query_lower:
            mock_results = [{"COUNT": 1250}]
        elif 'fraud' in query_lower:
            mock_results = [
                {
                    "TX_ID_KEY": "tx_12345",
                    "EMAIL": "user@example.com", 
                    "MODEL_SCORE": 0.85,
                    "IS_FRAUD_TX": 1,
                    "TX_DATETIME": "2024-01-15T10:30:00",
                    "GMV": 299.99
                }
            ]
        elif 'user' in query_lower or 'email' in query_lower:
            mock_results = [
                {
                    "TX_ID_KEY": "tx_67890",
                    "EMAIL": "customer@domain.com",
                    "TX_DATETIME": "2024-01-14T15:45:00", 
                    "NSURE_LAST_DECISION": "APPROVED",
                    "MODEL_SCORE": 0.25,
                    "GMV": 49.99
                }
            ]
        
        logger.info(f"Query executed successfully, returned {len(mock_results)} rows")
        return mock_results