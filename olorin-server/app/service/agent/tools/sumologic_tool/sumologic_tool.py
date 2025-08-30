"""
SumoLogic Query Tool for LangChain

This tool allows querying SumoLogic for application logs, API metrics, and performance data.
"""

from typing import Any, Dict
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
import logging
import asyncio

logger = logging.getLogger(__name__)


class _SumoLogicQueryArgs(BaseModel):
    """Arguments for SumoLogic query."""
    query: str = Field(..., description="The SumoLogic search query to execute.")
    time_range: str = Field("-15m", description="Time range for the query (e.g., '-15m', '-1h', '-24h').")


class SumoLogicClient:
    """Client for interacting with SumoLogic API."""
    
    def __init__(self, access_id: str, access_key: str, endpoint: str):
        self.access_id = access_id
        self.access_key = access_key
        self.endpoint = endpoint
        
    async def connect(self):
        """Establish connection to SumoLogic."""
        await asyncio.sleep(0.1)  # Simulate connection
        logger.info(f"Connected to SumoLogic endpoint: {self.endpoint}")
        
    async def disconnect(self):
        """Close SumoLogic connection."""
        await asyncio.sleep(0.1)
        logger.info("Disconnected from SumoLogic")
        
    async def search(self, query: str, time_range: str) -> Dict[str, Any]:
        """Execute a SumoLogic search query."""
        logger.info(f"Executing SumoLogic query: {query} for range: {time_range}")
        # In production, this would make actual API calls to SumoLogic
        await asyncio.sleep(0.5)  # Simulate query execution
        return {"results": [], "messages": [], "fields": []}


class SumoLogicQueryTool(BaseTool):
    """LangChain tool for querying SumoLogic application and API logs."""
    
    name: str = "sumologic_query_tool"
    description: str = (
        "Queries SumoLogic for application logs, API metrics, and performance data. "
        "Use this tool when you need to analyze application behavior, API call patterns, "
        "response times, error rates, or application-level fraud indicators. "
        "SumoLogic contains different data than Splunk - it focuses on application metrics "
        "rather than security events."
    )
    
    # Explicit args schema for strict tool parsing
    args_schema: type[BaseModel] = _SumoLogicQueryArgs
    
    # Connection parameters
    endpoint: str = Field(
        "https://api.sumologic.com/api/v1",
        description="SumoLogic API endpoint"
    )
    
    def _run(self, query: str, time_range: str = "-15m") -> Dict[str, Any]:
        """Synchronous execution wrapper."""
        import asyncio
        return asyncio.run(self._arun(query, time_range))
    
    async def _arun(self, query: str, time_range: str = "-15m") -> Dict[str, Any]:
        """Async execution of the SumoLogic query."""
        from app.service.config import get_settings_for_env
        from app.utils.firebase_secrets import get_app_secret
        
        settings = get_settings_for_env()
        
        # Get credentials (would come from settings/secrets in production)
        access_id = getattr(settings, 'sumologic_access_id', 'default_id')
        access_key = getattr(settings, 'sumologic_access_key', None)
        
        if not access_key:
            # Fallback to secrets manager
            try:
                access_key = get_app_secret("olorin/sumologic_access_key")
            except:
                access_key = "demo_key"
        
        client = SumoLogicClient(
            access_id=access_id,
            access_key=access_key,
            endpoint=self.endpoint
        )
        
        try:
            await client.connect()
            results = await client.search(query, time_range)
            
            logger.info(f"SumoLogic query completed, returned {len(results.get('results', []))} results")
            return results
            
        except Exception as e:
            logger.error(f"SumoLogic query failed: {str(e)}")
            return {
                "error": str(e),
                "results": [],
                "query_status": "failed"
            }
        finally:
            try:
                await client.disconnect()
            except Exception:
                pass