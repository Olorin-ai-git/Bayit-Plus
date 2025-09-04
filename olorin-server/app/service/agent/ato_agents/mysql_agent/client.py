"""Professional MySQL client with connection pooling and async support."""

from typing import Any, Dict, List, Optional, Tuple
import aiomysql  # type: ignore
from aiomysql import Pool  # type: ignore

from app.utils.firebase_secrets import get_firebase_secret
from .config import MySQLConfig, MySQLError, MySQLConnectionError, MySQLQueryError, TableInfo
from .analysis import MySQLAnalyzer
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MySQLClient:
    """Async MySQL client with connection pooling."""

    def __init__(
        self, 
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None,
        config: Optional[MySQLConfig] = None
    ):
        """Initialize MySQL client with parameters or Firebase secrets."""
        self._pool: Optional[Pool] = None
        
        if config:
            self._config = config
        elif all([host, port, username, password, database]):
            self._config = MySQLConfig(
                host=host,  # type: ignore
                port=port,  # type: ignore
                user=username,  # type: ignore
                password=password,  # type: ignore
                database=database  # type: ignore
            )
        else:
            self._config = self._load_config_from_secrets()
        
        self._connected = False
        self._analyzer = MySQLAnalyzer(self)

    def _load_config_from_secrets(self) -> MySQLConfig:
        """Load MySQL configuration from Firebase secrets."""
        host = get_firebase_secret("MYSQL_HOST")
        port_str = get_firebase_secret("MYSQL_PORT")
        user = get_firebase_secret("MYSQL_USER")
        password = get_firebase_secret("MYSQL_PASSWORD")
        database = get_firebase_secret("MYSQL_DATABASE")

        if not all([host, port_str, user, password, database]):
            raise MySQLConnectionError(
                "Missing required MySQL credentials in Firebase secrets"
            )

        try:
            port = int(port_str) if port_str else 3306
        except (ValueError, TypeError):
            port = 3306

        return MySQLConfig(
            host=host,  # type: ignore
            port=port,
            user=user,  # type: ignore
            password=password,  # type: ignore
            database=database  # type: ignore
        )

    async def connect(self) -> None:
        """Create MySQL connection pool."""
        if self._connected:
            return

        try:
            self._pool = await aiomysql.create_pool(
                host=self._config.host,
                port=self._config.port,
                user=self._config.user,
                password=self._config.password,
                db=self._config.database,
                charset=self._config.charset,
                autocommit=self._config.autocommit,
                minsize=self._config.minsize,
                maxsize=self._config.maxsize
            )
            
            # Test connection
            await self._test_connection()
            self._connected = True
            logger.info(f"Connected to MySQL database '{self._config.database}'")
            
        except Exception as e:
            await self._cleanup_pool()
            raise MySQLConnectionError(f"Failed to connect to MySQL: {e}")

    async def _test_connection(self) -> None:
        """Test connection with a simple query."""
        try:
            async with self._pool.acquire() as conn:
                async with conn.cursor() as cursor:
                    await cursor.execute("SELECT 1")
                    await cursor.fetchone()
        except Exception as e:
            raise MySQLConnectionError(f"Connection test failed: {e}")

    async def disconnect(self) -> None:
        """Close MySQL connection pool."""
        await self._cleanup_pool()
        self._connected = False
        logger.info("Disconnected from MySQL")

    async def _cleanup_pool(self) -> None:
        """Clean up connection pool."""
        if self._pool:
            self._pool.close()
            await self._pool.wait_closed()
            self._pool = None

    async def execute_query(
        self, 
        query: str, 
        params: Optional[Tuple] = None
    ) -> Dict[str, Any]:
        """Execute SQL query and return results."""
        if not self._connected:
            await self.connect()

        if self._pool is None:
            raise MySQLConnectionError("Connection pool not initialized")

        try:
            async with self._pool.acquire() as conn:
                async with conn.cursor(aiomysql.DictCursor) as cursor:
                    await cursor.execute(query, params or ())
                    
                    if query.strip().upper().startswith('SELECT'):
                        results = await cursor.fetchall()
                        return {
                            "results": list(results),
                            "columns": [desc[0] for desc in cursor.description],
                            "row_count": len(results)
                        }
                    else:
                        return {
                            "affected_rows": cursor.rowcount,
                            "last_insert_id": cursor.lastrowid
                        }
                        
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise MySQLQueryError(f"Query execution failed: {e}")

    async def get_tables(self) -> List[TableInfo]:
        """Get information about all tables in the database."""
        table_data = await self._analyzer.get_tables()
        return [
            TableInfo(
                name=table["name"],
                columns=table["columns"],
                row_count=table["row_count"],
                engine=table["engine"],
                charset=table["charset"]
            )
            for table in table_data
        ]

    async def analyze_table(self, table_name: str) -> Dict[str, Any]:
        """Get detailed analysis of a table including column statistics."""
        return await self._analyzer.analyze_table(table_name)

    async def get_table_relationships(self) -> List[Dict[str, Any]]:
        """Get foreign key relationships between tables."""
        return await self._analyzer.get_table_relationships()

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()