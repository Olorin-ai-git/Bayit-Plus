import os
from typing import Any, Dict

from fastapi import HTTPException
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

# Direct import to avoid the agents module dependency
from app.service.agent.ato_agents.splunk_agent.client import SplunkClient
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
            # Return demo data for testing
            from app.mock.demo_splunk_data import (
                network_splunk_data,
                device_splunk_data,
                location_splunk_data,
                logs_splunk_data
            )
            
            # Parse query to determine what type of data to return
            query_lower = query.lower()
            if "device" in query_lower or "fuzzy_device" in query_lower:
                return {"results": device_splunk_data}
            elif "network" in query_lower or "ip_address" in query_lower or "isp" in query_lower:
                return {"results": network_splunk_data}
            elif "location" in query_lower or "city" in query_lower or "geo" in query_lower:
                return {"results": location_splunk_data}
            elif "log" in query_lower or "transaction" in query_lower or "login" in query_lower:
                return {"results": logs_splunk_data}
            else:
                # Default to logs data if query type unclear
                return {"results": logs_splunk_data}
        
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
