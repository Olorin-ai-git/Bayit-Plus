from typing import Any, Dict

from fastapi import HTTPException
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

# Direct import to avoid the agents module dependency
from app.service.agent.ato_agents.splunk_agent.client import SplunkClient
from app.service.config import get_settings_for_env


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
        "ip.adhoc.rest.splunk.intuit.com",
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
        # Fetch the Splunk password from settings or environment
        settings = get_settings_for_env()
        password = settings.splunk_password or ""
        client = SplunkClient(
            host=settings.splunk_host,
            port=self.port,
            username=self.username,
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
