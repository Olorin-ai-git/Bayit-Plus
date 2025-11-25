import os
from typing import Any, Dict

from fastapi import HTTPException
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field


# Mock SplunkClient for testing when ato_agents module is not available
class MockSplunkClient:
    """Mock Splunk client for testing purposes"""

    def __init__(self, host, port, username, password):
        self.host = host
        self.port = port
        self.username = username
        self.password = password

    async def connect(self):
        """Mock connection"""
        pass

    async def search(self, query):
        """Mock search that returns empty results"""
        return {"results": []}

    async def disconnect(self):
        """Mock disconnection"""
        pass


# Use mock client for now - TODO: Replace with proper Splunk SDK implementation
SplunkClient = MockSplunkClient
from app.service.config import get_settings_for_env
from app.utils.firebase_secrets import get_app_secret


class _SplunkQueryArgs(BaseModel):
    query: str = Field(..., description="The complete SPL search query to execute.")


class SplunkQueryTool(BaseTool):
    """LangChain tool that executes a Splunk SPL query and returns raw JSON results."""

    name: str = "splunk_query_tool"
    description: str = (
        "Runs a Splunk SPL query and returns the search results as JSON. "
        "Use this tool whenever log or telemetry data from Splunk is needed."
    )

    # Explicit args schema so the tool is treated as *strict* for auto-parsing
    args_schema: type[BaseModel] = _SplunkQueryArgs

    # Connection parameters can be overridden via constructor if needed
    host: str = Field(
        "ip.adhoc.rest.splunk.olorin.com",
        description="Splunk host name",
    )
    port: int = Field(443, description="Splunk port")
    username: str = Field("ged_temp_credentials", description="Splunk username")

    def _run(self, query: str) -> Dict[str, Any]:  # type: ignore[override]
        """Synchronous execution wrapper that delegates to asyncio for compatibility."""
        import asyncio

        return asyncio.run(self._arun(query))

    async def _arun(self, query: str) -> Dict[str, Any]:  # type: ignore[override]
        """Async execution of the Splunk query."""

        # Check for demo/test mode
        if os.getenv("OLORIN_USE_DEMO_DATA", "false").lower() == "true":
            # Return empty results for testing when demo data is not available
            return {"results": []}

        settings = get_settings_for_env()

        # Use environment variables if available, otherwise fall back to IDPS secrets
        if settings.splunk_username and settings.splunk_password:
            username = settings.splunk_username
            password = settings.splunk_password
        else:
            # Fallback to IDPS secrets and hardcoded username
            username = self.username
            password = get_app_secret("olorin/splunk_password")

        client = SplunkClient(
            host=settings.splunk_host,
            port=self.port,
            username=username,
            password=password,
        )

        try:
            await client.connect()
            results = await client.search(query)
            return results
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            # Best-effort disconnect; ignore errors on disconnect
            try:
                await client.disconnect()
            except Exception:
                pass
