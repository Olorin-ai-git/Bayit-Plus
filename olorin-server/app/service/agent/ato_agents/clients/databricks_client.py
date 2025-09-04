"""Professional Databricks client for SQL warehouse queries and authentication."""

from typing import Any, Dict, List, Optional
import aiohttp

from app.utils.firebase_secrets import get_firebase_secret
from .databricks_config import (
    DatabricksConfig, 
    DatabricksError, 
    DatabricksConnectionError, 
    DatabricksQueryError
)
from app.service.logging import get_bridge_logger
from .databricks_executor import DatabricksExecutor

logger = get_bridge_logger(__name__)


class DatabricksClient:
    """Async client for Databricks SQL warehouse operations."""

    def __init__(self, config: Optional[DatabricksConfig] = None):
        """Initialize Databricks client with config or Firebase secrets."""
        self._session: Optional[aiohttp.ClientSession] = None
        self._config = config or self._load_config_from_secrets()
        self._base_url = f"https://{self._config.server_hostname}/api/2.0/sql"
        self._connected = False
        self._executor: Optional[DatabricksExecutor] = None

    def _load_config_from_secrets(self) -> DatabricksConfig:
        """Load Databricks configuration from Firebase secrets."""
        server_hostname = get_firebase_secret("DATABRICKS_SERVER_HOSTNAME")
        http_path = get_firebase_secret("DATABRICKS_HTTP_PATH")
        access_token = get_firebase_secret("DATABRICKS_TOKEN")
        catalog = get_firebase_secret("DATABRICKS_CATALOG")
        schema = get_firebase_secret("DATABRICKS_SCHEMA")

        if not all([server_hostname, http_path, access_token]):
            raise DatabricksConnectionError(
                "Missing required Databricks credentials in Firebase secrets"
            )

        return DatabricksConfig(
            server_hostname=server_hostname,  # type: ignore
            http_path=http_path,  # type: ignore
            access_token=access_token,  # type: ignore
            catalog=catalog,
            schema=schema
        )

    async def connect(self) -> None:
        """Establish connection to Databricks."""
        if self._connected:
            return

        try:
            headers = {
                "Authorization": f"Bearer {self._config.access_token}",
                "Content-Type": "application/json"
            }
            
            timeout = aiohttp.ClientTimeout(total=self._config.timeout)
            self._session = aiohttp.ClientSession(
                headers=headers,
                timeout=timeout
            )
            
            # Initialize executor
            self._executor = DatabricksExecutor(self._session, self._config, self._base_url)
            
            # Test connection with a simple query
            await self._test_connection()
            self._connected = True
            logger.info("Connected to Databricks successfully")
            
        except Exception as e:
            await self._cleanup_session()
            raise DatabricksConnectionError(f"Failed to connect to Databricks: {e}")

    async def _test_connection(self) -> None:
        """Test connection with a simple query."""
        try:
            if self._executor is None:
                raise DatabricksConnectionError("Executor not initialized")
            await self._executor.execute_query("SELECT 1 as test", timeout=30)
        except Exception as e:
            raise DatabricksConnectionError(f"Connection test failed: {e}")

    async def disconnect(self) -> None:
        """Close Databricks connection."""
        await self._cleanup_session()
        self._connected = False
        logger.info("Disconnected from Databricks")

    async def _cleanup_session(self) -> None:
        """Clean up HTTP session."""
        if self._session:
            await self._session.close()
            self._session = None
        self._executor = None

    async def execute_query(
        self, 
        query: str, 
        parameters: Optional[Dict[str, Any]] = None,
        timeout: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Execute SQL query and return results."""
        if not self._connected:
            await self.connect()
        
        if self._executor is None:
            raise DatabricksConnectionError("Executor not initialized")
        
        return await self._executor.execute_query(query, parameters, timeout)

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()