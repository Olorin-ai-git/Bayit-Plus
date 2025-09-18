"""
Real Snowflake database client for production query execution.
Uses snowflake-connector-python for actual database connectivity.
"""

import os
from typing import Any, Dict, List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader

logger = get_bridge_logger(__name__)

# Thread pool for blocking Snowflake operations
executor = ThreadPoolExecutor(max_workers=5)


class RealSnowflakeClient:
    """Production client for interacting with Snowflake data warehouse."""
    
    def __init__(self):
        """Initialize with configuration from environment/Firebase."""
        self.connection = None
        self.cursor = None
        self._load_configuration()
    
    def _load_configuration(self):
        """Load Snowflake configuration from config loader."""
        loader = get_config_loader()
        config = loader.load_snowflake_config()
        
        # Store configuration
        self.account = config.get('account')
        self.host = config.get('host', self.account)  # Host can be same as account
        self.user = config.get('user')
        self.password = config.get('password')
        self.database = config.get('database', os.getenv('SNOWFLAKE_DATABASE', 'OLORIN_FRAUD_DB'))
        self.schema = config.get('schema', 'PUBLIC')
        self.warehouse = config.get('warehouse', 'COMPUTE_WH')
        self.role = config.get('role')
        self.authenticator = config.get('authenticator', 'snowflake')
        
        # Connection pool settings
        self.pool_size = int(config.get('pool_size', '5'))
        self.pool_max_overflow = int(config.get('pool_max_overflow', '10'))
        self.pool_timeout = int(config.get('pool_timeout', '30'))
        self.query_timeout = int(config.get('query_timeout', '300'))
        
        # Validate critical configuration
        if not all([self.account, self.user, self.password, self.database]):
            missing = []
            if not self.account: missing.append('SNOWFLAKE_ACCOUNT')
            if not self.user: missing.append('SNOWFLAKE_USER')
            if not self.password: missing.append('SNOWFLAKE_PASSWORD')
            if not self.database: missing.append('SNOWFLAKE_DATABASE')
            
            logger.error(f"Missing critical Snowflake configuration: {', '.join(missing)}")
            logger.error("Please configure these in your .env file")
            # Don't raise exception - just warn (as per requirements)
    
    def _get_connection(self):
        """Get or create Snowflake connection."""
        if self.connection is None:
            try:
                import snowflake.connector
                
                # Build connection parameters
                conn_params = {
                    'account': self.account,
                    'user': self.user,
                    'password': self.password,
                    'database': self.database,
                    'schema': self.schema,
                    'warehouse': self.warehouse,
                    'network_timeout': self.query_timeout,
                    'login_timeout': 60,
                }
                
                # Add optional parameters
                if self.role:
                    conn_params['role'] = self.role
                if self.authenticator and self.authenticator != 'snowflake':
                    conn_params['authenticator'] = self.authenticator
                
                logger.info(f"🔗 Initiating Snowflake connection...")
                logger.info(f"   Account: {self.account}")
                logger.info(f"   User: {self.user}")
                logger.info(f"   Database: {self.database}")
                logger.info(f"   Schema: {self.schema}")
                logger.info(f"   Warehouse: {self.warehouse}")
                logger.info(f"   Timeout: {self.query_timeout}s")
                logger.info(f"   This may take 30-60 seconds...")
                
                logger.info(f"Connecting to Snowflake account: {self.account}")
                self.connection = snowflake.connector.connect(**conn_params)
                self.cursor = self.connection.cursor()
                logger.info(f"✅ Successfully connected to Snowflake: {self.database}.{self.schema}")
                
            except ImportError:
                logger.error("snowflake-connector-python not installed. Run: poetry add snowflake-connector-python")
                raise
            except Exception as e:
                logger.error(f"❌ Failed to connect to Snowflake: {e}")
                raise
        
        return self.connection
    
    async def connect(self, database: Optional[str] = None, schema: Optional[str] = None):
        """Establish connection to Snowflake asynchronously."""
        # Override database/schema if provided
        if database:
            self.database = database
        if schema:
            self.schema = schema
        
        # Run blocking connection in thread pool
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(executor, self._get_connection)
    
    async def disconnect(self):
        """Close Snowflake connection asynchronously."""
        if self.cursor:
            try:
                self.cursor.close()
            except:
                pass
        
        if self.connection:
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(executor, self.connection.close)
                logger.info("Disconnected from Snowflake")
            except Exception as e:
                logger.warning(f"Error closing Snowflake connection: {e}")
            finally:
                self.connection = None
                self.cursor = None
    
    def validate_query(self, query: str, limit: Optional[int] = None) -> str:
        """Validate and enhance SQL query for safety and performance."""
        query = query.strip()
        query_upper = query.upper()
        
        # Only allow SELECT statements and CTEs (WITH) for security
        if not (query_upper.startswith('SELECT') or query_upper.startswith('WITH')):
            raise ValueError("Only SELECT queries and CTEs are allowed for security reasons")
        
        # Check for dangerous keywords
        dangerous_keywords = ['DELETE', 'DROP', 'INSERT', 'UPDATE', 'CREATE', 'ALTER', 'TRUNCATE', 'MERGE']
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                raise ValueError(f"Query contains restricted keyword: {keyword}")
        
        # Add LIMIT if not present and limit is specified
        if limit and 'LIMIT' not in query_upper:
            query = f"{query.rstrip(';')} LIMIT {min(limit, 10000)}"
        
        return query
    
    def _execute_query_sync(self, query: str) -> List[Dict[str, Any]]:
        """Execute query synchronously (runs in thread pool)."""
        conn = self._get_connection()
        cursor = self.cursor
        
        try:
            # Execute query
            cursor.execute(query)
            
            # Fetch all results
            rows = cursor.fetchall()
            
            # Get column names
            columns = [desc[0] for desc in cursor.description]
            
            # Convert to list of dictionaries
            results = []
            for row in rows:
                results.append(dict(zip(columns, row)))
            
            return results
            
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    async def execute_query(self, query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Execute a SQL query against Snowflake asynchronously."""
        # Validate query
        safe_query = self.validate_query(query, limit)
        
        logger.info(f"Executing Snowflake query: {safe_query[:200]}...")
        
        # Run blocking query in thread pool
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            executor, 
            self._execute_query_sync, 
            safe_query
        )
        
        logger.info(f"Query completed, returned {len(results)} rows")
        return results
    
    async def get_top_risk_entities(
        self, 
        time_window_hours: int = 24,
        group_by: str = 'email',
        top_percentage: float = 0.10,
        min_transactions: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Get top risk entities based on risk-weighted transaction value.
        
        Args:
            time_window_hours: Hours to look back (default: 24)
            group_by: Field to group by (email, device_id, etc.)
            top_percentage: Top percentage to return (0.10 = top 10%)
            min_transactions: Minimum transactions required
            
        Returns:
            List of top risk entities with metrics
        """
        query = f"""
        WITH risk_calculations AS (
            SELECT 
                {group_by} as entity,
                COUNT(*) as transaction_count,
                SUM(PAID_AMOUNT_VALUE) as total_amount,
                AVG(MODEL_SCORE) as avg_risk_score,
                SUM(MODEL_SCORE * PAID_AMOUNT_VALUE) as risk_weighted_value,
                MAX(MODEL_SCORE) as max_risk_score,
                SUM(CASE WHEN IS_FRAUD_TX = 1 THEN 1 ELSE 0 END) as fraud_count
            FROM {self.database}.{self.schema}.{os.getenv('SNOWFLAKE_TRANSACTIONS_TABLE', 'TRANSACTIONS_ENRICHED')}
            WHERE TX_DATETIME >= DATEADD(hour, -{time_window_hours}, CURRENT_TIMESTAMP())
                AND {group_by} IS NOT NULL
            GROUP BY {group_by}
            HAVING COUNT(*) >= {min_transactions}
        ),
        ranked AS (
            SELECT *,
                ROW_NUMBER() OVER (ORDER BY risk_weighted_value DESC) as risk_rank,
                COUNT(*) OVER() as total_entities
            FROM risk_calculations
        )
        SELECT * FROM ranked
        WHERE risk_rank <= CEIL(total_entities * {top_percentage})
        ORDER BY risk_weighted_value DESC
        """
        
        return await self.execute_query(query)
    
    async def test_connection(self) -> bool:
        """Test Snowflake connection."""
        try:
            await self.connect()
            results = await self.execute_query("SELECT CURRENT_VERSION() as version, CURRENT_DATABASE() as db")
            if results:
                logger.info(f"Snowflake connection test successful: {results[0]}")
                return True
            return False
        except Exception as e:
            logger.error(f"Snowflake connection test failed: {e}")
            return False
        finally:
            await self.disconnect()