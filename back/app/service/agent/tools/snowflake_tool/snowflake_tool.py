import asyncio
import logging
from typing import Any, Dict, List

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.service.config import get_settings_for_env

import snowflake.connector

logger = logging.getLogger(__name__)


class _SnowflakeQueryArgs(BaseModel):
    query: str = Field(..., description="SQL query to execute in Snowflake")


class SnowflakeQueryTool(BaseTool):
    """LangChain tool to execute SQL queries against Snowflake."""

    name: str = "snowflake_query_tool"
    description: str = (
        "Executes a SQL query against Snowflake and returns the results as JSON."
    )
    args_schema: type[BaseModel] = _SnowflakeQueryArgs

    def _run(self, query: str) -> List[Dict[str, Any]]:  # type: ignore[override]
        return asyncio.run(self._arun(query))

    async def _arun(self, query: str) -> List[Dict[str, Any]]:  # type: ignore[override]
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._execute_query, query)

    def _execute_query(self, query: str) -> List[Dict[str, Any]]:
        settings = get_settings_for_env()
        conn = snowflake.connector.connect(
            user=settings.snowflake_user,
            password=settings.snowflake_password,
            account=settings.snowflake_account,
            warehouse=settings.snowflake_warehouse,
            database=settings.snowflake_database,
            schema=settings.snowflake_schema,
        )
        try:
            cursor = conn.cursor()
            try:
                cursor.execute(query)
                cols = [c[0] for c in cursor.description]
                rows = cursor.fetchall()
                return [dict(zip(cols, row)) for row in rows]
            finally:
                cursor.close()
        finally:
            conn.close()
