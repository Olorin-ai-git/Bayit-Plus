"""
Real Snowflake database client for production query execution.
Uses snowflake-connector-python for actual database connectivity.
"""

import os
from typing import Any, Dict, List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

from app.service.logging import get_bridge_logger
from app.service.config_loader import get_config_loader
from .schema_constants import PAID_AMOUNT_VALUE_IN_CURRENCY, MODEL_SCORE, IS_FRAUD_TX, TX_DATETIME, get_required_env_var

# Import cryptography for private key handling
try:
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import serialization
    CRYPTOGRAPHY_AVAILABLE = True
except ImportError:
    CRYPTOGRAPHY_AVAILABLE = False

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
        """Load Snowflake configuration from config loader and environment."""
        loader = get_config_loader()
        config = loader.load_snowflake_config()
        
        # Store configuration
        self.account = config.get('account')
        self.host = config.get('host', self.account)  # Host can be same as account
        self.user = config.get('user')
        self.password = config.get('password')
        self.oauth_token = config.get('oauth_token')
        self.database = config.get('database')
        self.schema = config.get('schema', 'PUBLIC')
        self.warehouse = config.get('warehouse', 'COMPUTE_WH')
        self.role = config.get('role')
        
        # Get authentication method from config or environment
        self.auth_method = config.get('auth_method') or os.getenv('SNOWFLAKE_AUTH_METHOD', 'password')
        self.private_key_path = config.get('private_key_path') or os.getenv('SNOWFLAKE_PRIVATE_KEY_PATH')
        self.private_key_passphrase = config.get('private_key_passphrase') or os.getenv('SNOWFLAKE_PRIVATE_KEY_PASSPHRASE')
        
        # Legacy authenticator field (for backward compatibility)
        self.authenticator = config.get('authenticator', 'snowflake')
        
        # Connection pool settings
        self.pool_size = int(config.get('pool_size', '5'))
        self.pool_max_overflow = int(config.get('pool_max_overflow', '10'))
        self.pool_timeout = int(config.get('pool_timeout', '30'))
        self.query_timeout = int(config.get('query_timeout', '300'))

        # Query limits
        self.max_transactions_limit = int(config.get('max_transactions_limit', '1000'))

        # Load table name from environment - no defaults!
        self.transactions_table = get_required_env_var('SNOWFLAKE_TRANSACTIONS_TABLE')

        # Validate critical configuration based on authentication method
        missing = []
        if not self.account: missing.append('SNOWFLAKE_ACCOUNT')
        if not self.user: missing.append('SNOWFLAKE_USER')
        if not self.database: missing.append('SNOWFLAKE_DATABASE')

        # Authentication validation based on auth_method
        if self.auth_method == 'private_key':
            if not self.private_key_path:
                missing.append('SNOWFLAKE_PRIVATE_KEY_PATH (required for private_key auth)')
            elif not Path(self.private_key_path).exists():
                missing.append(f'SNOWFLAKE_PRIVATE_KEY_PATH file not found: {self.private_key_path}')
            if not CRYPTOGRAPHY_AVAILABLE:
                logger.error("cryptography library not available - required for private key authentication")
                missing.append('cryptography library (install with: poetry add cryptography)')
        elif self.auth_method == 'oauth':
            if not self.oauth_token:
                missing.append('SNOWFLAKE_OAUTH_TOKEN (required for OAuth auth)')
        else:
            # Default password authentication
            if not self.password:
                missing.append('SNOWFLAKE_PASSWORD (required for password auth)')

        if missing:
            logger.error(f"Missing critical Snowflake configuration: {', '.join(missing)}")
            logger.error("Please configure these in your .env file")
            # Don't raise exception - just warn (as per requirements)

    def get_full_table_name(self) -> str:
        """Get the full qualified table name: database.schema.table"""
        if self.database and self.schema:
            return f"{self.database}.{self.schema}.{self.transactions_table}"
        elif self.database:
            return f"{self.database}.{self.transactions_table}"
        else:
            return self.transactions_table

    def _load_private_key(self) -> bytes:
        """
        Load and decode the RSA private key.
        
        Returns:
            Serialized private key in DER format
            
        Raises:
            ValueError: If private key cannot be loaded
        """
        if not CRYPTOGRAPHY_AVAILABLE:
            raise ValueError("cryptography library not available - required for private key authentication")
        
        if not self.private_key_path:
            raise ValueError("SNOWFLAKE_PRIVATE_KEY_PATH not configured")
        
        try:
            with open(self.private_key_path, "rb") as key_file:
                private_key_data = key_file.read()

            # Determine if passphrase is needed
            passphrase = None
            if self.private_key_passphrase:
                passphrase = self.private_key_passphrase.encode()

            # Load the private key
            private_key = serialization.load_pem_private_key(
                private_key_data,
                password=passphrase,
                backend=default_backend()
            )

            # Serialize to DER format for Snowflake
            return private_key.private_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )

        except Exception as e:
            # Mask file paths in error messages (show basename only)
            from pathlib import Path
            key_name = Path(self.private_key_path).name if self.private_key_path else "not set"
            raise ValueError(f"Failed to load private key from {key_name}: {e}")

    def _get_connection(self):
        """Get or create Snowflake connection."""
        if self.connection is None:
            try:
                import snowflake.connector
                
                # Build base connection parameters
                conn_params = {
                    'account': self.account,
                    'user': self.user,
                    'database': self.database,
                    'schema': self.schema,
                    'warehouse': self.warehouse,
                    'network_timeout': self.query_timeout,
                    'login_timeout': 60,
                    # SSL/TLS configuration to fix handshake issues
                    'disable_ocsp_checks': True,  # Disable OCSP checks (replaces deprecated insecure_mode)
                    'ocsp_response_cache_filename': None,  # Disable OCSP cache to avoid SSL issues
                    'client_session_keep_alive': True,
                    'client_request_mfa_token': False,
                    # Additional SSL workaround parameters
                    'session_parameters': {
                        'PYTHON_CONNECTOR_QUERY_RESULT_FORMAT': 'json'
                    }
                }

                # Add authentication parameters based on auth_method
                if self.auth_method == 'private_key':
                    # Private key authentication - load key and use private_key parameter
                    logger.info(f"Using private key authentication for user: {self.user}")
                    try:
                        private_key = self._load_private_key()
                        conn_params['private_key'] = private_key
                        logger.info(f"Private key loaded from: {self.private_key_path}")
                    except Exception as e:
                        logger.error(f"Failed to load private key: {e}")
                        raise
                elif self.auth_method == 'oauth' or self.authenticator == 'oauth':
                    # OAuth authentication - use token
                    conn_params['authenticator'] = 'oauth'
                    conn_params['token'] = self.oauth_token
                    logger.info(f"Using OAuth token authentication for user: {self.user}")
                elif self.auth_method == 'externalbrowser':
                    # External browser (SSO) authentication
                    conn_params['authenticator'] = 'externalbrowser'
                    logger.info(f"Using external browser (SSO) authentication for user: {self.user}")
                else:
                    # Default password authentication
                    conn_params['password'] = self.password
                    if self.authenticator and self.authenticator != 'snowflake':
                        conn_params['authenticator'] = self.authenticator
                    logger.info(f"Using password authentication for user: {self.user}")

                # Add optional parameters
                if self.role:
                    conn_params['role'] = self.role
                
                logger.info(f"🔗 Initiating Snowflake connection...")
                logger.info(f"   Account: {self.account}")
                logger.info(f"   User: {self.user}")
                logger.info(f"   Auth Method: {self.auth_method}")
                if self.auth_method == 'private_key':
                    # Mask file paths in logs (show basename only)
                    from pathlib import Path
                    key_name = Path(self.private_key_path).name if self.private_key_path else "not set"
                    logger.info(f"   Private Key: {key_name}")
                logger.info(f"   Database: {self.database}")
                logger.info(f"   Schema: {self.schema}")
                logger.info(f"   Warehouse: {self.warehouse}")
                logger.info(f"   Role: {self.role}")
                logger.info(f"   Timeout: {self.query_timeout}s")
                logger.info(f"   This may take 30-60 seconds...")
                
                logger.info(f"Connecting to Snowflake account: {self.account}")
                self.connection = snowflake.connector.connect(**conn_params)
                # CRITICAL: Create cursor immediately after connection to ensure it's initialized
                try:
                    self.cursor = self.connection.cursor()
                    logger.info(f"✅ Successfully connected to Snowflake: {self.database}.{self.schema}")
                except Exception as cursor_error:
                    logger.error(f"Failed to create cursor after connection: {cursor_error}")
                    # Close connection if cursor creation fails
                    try:
                        self.connection.close()
                    except:
                        pass
                    self.connection = None
                    raise
                
            except ImportError:
                logger.error("snowflake-connector-python not installed. Run: poetry add snowflake-connector-python")
                raise
            except Exception as e:
                logger.error(f"❌ Failed to connect to Snowflake: {e}")
                raise
        
        # CRITICAL: Ensure cursor exists after getting connection
        # This handles cases where connection exists but cursor is None (e.g., after disconnect/reconnect)
        if self.connection is not None and self.cursor is None:
            try:
                self.cursor = self.connection.cursor()
                logger.debug("Created cursor from existing connection")
            except Exception as e:
                logger.warning(f"Failed to create cursor from existing connection: {e}")
                # Don't raise - connection might still be usable, cursor will be created in _execute_query_sync
        
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
            query = f"{query.rstrip(';')} LIMIT {min(limit, self.max_transactions_limit)}"
        
        return query
    
    def _execute_query_sync(self, query: str) -> List[Dict[str, Any]]:
        """Execute query synchronously (runs in thread pool)."""
        # Check if connection is closed and reconnect if needed
        try:
            conn = self._get_connection()
            # Test if connection is still alive
            if self.connection and hasattr(self.connection, 'is_closed') and self.connection.is_closed():
                logger.warning("Connection is closed, reconnecting...")
                self.connection = None
                self.cursor = None
                conn = self._get_connection()
        except Exception as e:
            logger.warning(f"Connection check failed, reconnecting: {e}")
            self.connection = None
            self.cursor = None
            conn = self._get_connection()
        
        # CRITICAL FIX: Ensure cursor exists and is valid - create if None or invalid
        # This handles race conditions where cursor might be None after connection creation
        # or if cursor was closed/disconnected
        if self.cursor is None:
            try:
                self.cursor = conn.cursor()
                logger.debug("Created new cursor for query execution")
            except Exception as e:
                logger.error(f"Failed to create cursor: {e}")
                raise
        
        cursor = self.cursor
        
        # Validate cursor is still valid (not closed)
        try:
            # Test cursor is valid by checking if it has required attributes
            if not hasattr(cursor, 'execute'):
                logger.warning("Cursor is invalid, creating new cursor")
                self.cursor = conn.cursor()
                cursor = self.cursor
        except Exception as e:
            logger.warning(f"Cursor validation failed, creating new cursor: {e}")
            self.cursor = conn.cursor()
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
            
        except AttributeError as e:
            # Handle case where cursor is None or invalid
            if "'NoneType' object has no attribute" in str(e) or "_update_parameters" in str(e):
                logger.error(f"Cursor is None or invalid: {e}")
                logger.info("Attempting to recreate cursor and retry query")
                # Recreate connection and cursor if connection is closed
                try:
                    # Check if connection is closed
                    if self.connection and (hasattr(self.connection, 'is_closed') and self.connection.is_closed()):
                        logger.warning("Connection is closed, reconnecting...")
                        self.connection = None
                        self.cursor = None
                        conn = self._get_connection()
                    # Recreate cursor and retry once
                    self.cursor = conn.cursor()
                    cursor = self.cursor
                    cursor.execute(query)
                    rows = cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]
                    results = []
                    for row in rows:
                        results.append(dict(zip(columns, row)))
                    logger.info("Query succeeded after cursor recreation")
                    return results
                except Exception as retry_error:
                    logger.error(f"Query execution failed after cursor recreation: {retry_error}")
                    raise
            else:
                raise
        except Exception as e:
            # Handle connection closed errors
            error_str = str(e).lower()
            if 'connection is closed' in error_str or '08003' in error_str:
                logger.warning("Connection closed during query, reconnecting and retrying...")
                try:
                    self.connection = None
                    self.cursor = None
                    conn = self._get_connection()
                    self.cursor = conn.cursor()
                    cursor = self.cursor
                    cursor.execute(query)
                    rows = cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]
                    results = []
                    for row in rows:
                        results.append(dict(zip(columns, row)))
                    logger.info("Query succeeded after reconnection")
                    return results
                except Exception as reconnect_error:
                    logger.error(f"Query execution failed after reconnection: {reconnect_error}")
                    raise
            else:
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
                SUM({PAID_AMOUNT_VALUE_IN_CURRENCY}) as total_amount,
                AVG({MODEL_SCORE}) as avg_risk_score,
                SUM({MODEL_SCORE} * {PAID_AMOUNT_VALUE_IN_CURRENCY}) as risk_weighted_value,
                MAX({MODEL_SCORE}) as max_risk_score,
                SUM(CASE WHEN {IS_FRAUD_TX} = 1 THEN 1 ELSE 0 END) as fraud_count
            FROM {self.get_full_table_name()}
            WHERE {TX_DATETIME} >= DATEADD(hour, -{time_window_hours}, CURRENT_TIMESTAMP())
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