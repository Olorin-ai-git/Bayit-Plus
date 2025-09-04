"""Databricks SQL statement execution operations."""

import asyncio
from typing import Any, Dict, List, Optional

from .databricks_config import DatabricksQueryError
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DatabricksExecutor:
    """Handles Databricks SQL statement execution."""

    def __init__(self, session, config, base_url: str):
        """Initialize executor with session and config."""
        self._session = session
        self._config = config
        self._base_url = base_url

    async def execute_query(
        self, 
        query: str, 
        parameters: Optional[Dict[str, Any]] = None,
        timeout: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Execute SQL query and return results."""
        try:
            statement_id = await self._submit_statement(query, parameters, timeout)
            return await self._get_statement_result(statement_id)
            
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise DatabricksQueryError(f"Query execution failed: {e}")

    async def _submit_statement(
        self, 
        query: str, 
        parameters: Optional[Dict[str, Any]] = None,
        timeout: Optional[int] = None
    ) -> str:
        """Submit SQL statement to Databricks."""
        payload = {
            "statement": query,
            "warehouse_id": self._config.http_path.split('/')[-1],
            "wait_timeout": f"{timeout or self._config.timeout}s"
        }
        
        if self._config.catalog:
            payload["catalog"] = self._config.catalog
        if self._config.schema:
            payload["schema"] = self._config.schema
        if parameters:
            payload["parameters"] = parameters

        async with self._session.post(
            f"{self._base_url}/statements", 
            json=payload
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise DatabricksQueryError(
                    f"Failed to submit statement: {response.status} - {error_text}"
                )
            
            result = await response.json()
            return result["statement_id"]

    async def _get_statement_result(self, statement_id: str) -> List[Dict[str, Any]]:
        """Get statement execution result."""
        async with self._session.get(
            f"{self._base_url}/statements/{statement_id}"
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise DatabricksQueryError(
                    f"Failed to get statement result: {response.status} - {error_text}"
                )
            
            result = await response.json()
            
            # Wait for completion if still running
            while result["status"]["state"] in ["PENDING", "RUNNING"]:
                await asyncio.sleep(1)
                async with self._session.get(
                    f"{self._base_url}/statements/{statement_id}"
                ) as retry_response:
                    result = await retry_response.json()
            
            if result["status"]["state"] == "FAILED":
                error_message = result["status"].get("error", {}).get("message", "Unknown error")
                raise DatabricksQueryError(f"Statement execution failed: {error_message}")
            
            # Parse results
            if not result.get("result"):
                return []
                
            columns = [col["name"] for col in result["result"]["data_array"][0]]
            rows = result["result"]["data_array"][1:]
            
            return [dict(zip(columns, row)) for row in rows]