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
        if self.is_real:
            return await self._real_client.connect(database, schema)
        else:
            # Mock connection
            await asyncio.sleep(0.1)  # Simulate connection
            logger.info(f"Mock connected to Snowflake: {self.account}/{database}.{schema}")
            self.database = database
            self.schema = schema
        
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
            if not (query_upper.startswith('SELECT') or query_upper.startswith('WITH')):
                raise ValueError("Only SELECT queries and CTEs (WITH) are allowed for security reasons")
            
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
        if self.is_real:
            return await self._real_client.execute_query(query, limit)
        else:
            # Mock execution
            safe_query = self.validate_query(query, limit)
            
            logger.info(f"Mock executing query in {self.database}.{self.schema}: {safe_query[:100]}...")
            
            # Simulate query time
            await asyncio.sleep(0.5)
            
            # Return mock data structure matching schema
            mock_results = []
            query_lower = safe_query.lower()
            
            # Check for risk entity queries (CTEs)
            if 'risk_calculations' in query_lower and 'ip_address' in query_lower:
                # Return mock high-risk IP addresses
                mock_results = [
                    {"ENTITY": "67.76.8.209", "RISK_SCORE": 0.9234, "RISK_WEIGHTED_VALUE": 15678.90, 
                     "TRANSACTION_COUNT": 45, "FRAUD_COUNT": 12, "REJECTED_COUNT": 8},
                    {"ENTITY": "24.3.212.202", "RISK_SCORE": 0.8912, "RISK_WEIGHTED_VALUE": 12456.78,
                     "TRANSACTION_COUNT": 38, "FRAUD_COUNT": 9, "REJECTED_COUNT": 6},
                    {"ENTITY": "198.51.100.42", "RISK_SCORE": 0.8567, "RISK_WEIGHTED_VALUE": 9876.54,
                     "TRANSACTION_COUNT": 32, "FRAUD_COUNT": 7, "REJECTED_COUNT": 5},
                    {"ENTITY": "203.0.113.99", "RISK_SCORE": 0.8234, "RISK_WEIGHTED_VALUE": 8765.43,
                     "TRANSACTION_COUNT": 28, "FRAUD_COUNT": 6, "REJECTED_COUNT": 4},
                    {"ENTITY": "192.0.2.123", "RISK_SCORE": 0.7890, "RISK_WEIGHTED_VALUE": 7654.32,
                     "TRANSACTION_COUNT": 25, "FRAUD_COUNT": 5, "REJECTED_COUNT": 3},
                    {"ENTITY": "172.16.0.55", "RISK_SCORE": 0.7567, "RISK_WEIGHTED_VALUE": 6543.21,
                     "TRANSACTION_COUNT": 22, "FRAUD_COUNT": 4, "REJECTED_COUNT": 3},
                    {"ENTITY": "10.0.0.99", "RISK_SCORE": 0.7234, "RISK_WEIGHTED_VALUE": 5432.10,
                     "TRANSACTION_COUNT": 20, "FRAUD_COUNT": 3, "REJECTED_COUNT": 2},
                    {"ENTITY": "44.55.66.77", "RISK_SCORE": 0.6890, "RISK_WEIGHTED_VALUE": 4321.98,
                     "TRANSACTION_COUNT": 18, "FRAUD_COUNT": 3, "REJECTED_COUNT": 2},
                    {"ENTITY": "88.99.11.22", "RISK_SCORE": 0.6567, "RISK_WEIGHTED_VALUE": 3210.87,
                     "TRANSACTION_COUNT": 15, "FRAUD_COUNT": 2, "REJECTED_COUNT": 1},
                    {"ENTITY": "123.45.67.89", "RISK_SCORE": 0.6234, "RISK_WEIGHTED_VALUE": 2109.76,
                     "TRANSACTION_COUNT": 12, "FRAUD_COUNT": 2, "REJECTED_COUNT": 1}
                ]
            elif 'count(' in query_lower:
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
            
            logger.info(f"Mock query executed successfully, returned {len(mock_results)} rows")
            return mock_results